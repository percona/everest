// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Package upgrade implements upgrade logic for the CLI.
package upgrade

import (
	"context"
	"errors"
	"fmt"
	"net/url"

	version "github.com/Percona-Lab/percona-version-service/versionpb"
	goversion "github.com/hashicorp/go-version"
	"go.uber.org/zap"
	"k8s.io/apimachinery/pkg/types"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/install"
	"github.com/percona/everest/pkg/kubernetes"
	cliVersion "github.com/percona/everest/pkg/version"
)

type (
	// UpgradeConfig defines configuration required for upgrade command.
	UpgradeConfig struct {
		Everest struct {
			// Endpoint stores URL to Everest.
			Endpoint string
			// Token stores Everest token.
			Token string
		}

		// KubeconfigPath is a path to a kubeconfig
		KubeconfigPath string `mapstructure:"kubeconfig"`
		// VersionMetadataURL stores hostname to retrieve version metadata information from.
		VersionMetadataURL string `mapstructure:"version-metadata-url"`
	}

	// Upgrade struct implements upgrade command.
	Upgrade struct {
		l *zap.SugaredLogger

		config        *UpgradeConfig
		everestClient everestClientConnector
		kubeClient    *kubernetes.Kubernetes
	}

	supportedVersion struct {
		catalog       goversion.Constraints
		cli           goversion.Constraints
		olm           goversion.Constraints
		pgOperator    goversion.Constraints
		pxcOperator   goversion.Constraints
		psmdbOperator goversion.Constraints
	}

	requirementsCheck struct {
		operatorName string
		constraints  goversion.Constraints
	}
)

var ErrNoUpdateAvailable = errors.New("no update available")

// NewUpgrade returns a new Upgrade struct.
func NewUpgrade(cfg *UpgradeConfig, everestClient everestClientConnector, l *zap.SugaredLogger) (*Upgrade, error) {
	cli := &Upgrade{
		config:        cfg,
		everestClient: everestClient,
		l:             l.With("component", "upgrade"),
	}

	k, err := kubernetes.New(cfg.KubeconfigPath, cli.l)
	if err != nil {
		var u *url.Error
		if errors.As(err, &u) {
			cli.l.Error("Could not connect to Kubernetes. " +
				"Make sure Kubernetes is running and is accessible from this computer/server.")
		}
		return nil, err
	}
	cli.kubeClient = k
	return cli, nil
}

// Run runs the operators installation process.
func (u *Upgrade) Run(ctx context.Context) error {
	// Check prerequisites
	upgradeEverestTo, recVer, err := u.canUpgrade(ctx)
	if err != nil {
		if errors.Is(err, ErrNoUpdateAvailable) {
			u.l.Info("You're running the latest version of Everest")
			return nil
		}
		return err
	}

	// Start upgrade.
	if err := u.upgradeOLM(ctx, recVer.OLM); err != nil {
		return err
	}

	// We cannot use the latest version of catalog yet since
	// at the time of writing, each catalog version supports only one Everest version.
	u.l.Infof("Upgrading Percona Catalog to %s", recVer.Catalog)
	if err := u.kubeClient.InstallPerconaCatalog(ctx, recVer.Catalog); err != nil {
		return err
	}

	u.l.Infof("Upgrading Everest to %s in namespace %s", upgradeEverestTo, install.SystemNamespace)
	if err := u.kubeClient.InstallEverest(ctx, install.SystemNamespace, upgradeEverestTo); err != nil {
		return err
	}

	u.l.Infof("Everest has been upgraded to version %s", upgradeEverestTo)

	return nil
}

// canUpgrade checks if there's a new Everest version available and if we can upgrade to it
// based on minimum requirements.
func (u *Upgrade) canUpgrade(ctx context.Context) (*goversion.Version, *cliVersion.RecommendedVersion, error) {
	// Get Everest version.
	eVer, err := u.everestClient.Version(ctx)
	if err != nil {
		return nil, nil, errors.Join(err, errors.New("could not retrieve Everest version"))
	}
	everestVersion, err := goversion.NewSemver(eVer.Version)
	if err != nil {
		return nil, nil, errors.Join(err, fmt.Errorf("invalid Everest version %s", eVer.Version))
	}

	u.l.Infof("Current Everest version is %s", everestVersion)

	// Determine version to upgrade to.
	upgradeEverestTo, meta, err := u.versionToUpgradeTo(ctx, everestVersion)
	if err != nil {
		return nil, nil, err
	}

	u.l.Infof("Found available upgrade to Everest version %s", upgradeEverestTo)

	// Check requirements.
	u.l.Infof("Checking requirements for upgrade to Everest %s", upgradeEverestTo)
	if err := u.verifyRequirements(ctx, meta); err != nil {
		return nil, nil, err
	}

	recVer, err := cliVersion.RecommendedVersions(meta)
	if err != nil {
		return nil, nil, err
	}

	return upgradeEverestTo, recVer, nil
}

// versionToUpgradeTo returns version to which the current Everest version can be upgraded to.
func (u *Upgrade) versionToUpgradeTo(
	ctx context.Context, currentEverestVersion *goversion.Version,
) (*goversion.Version, *version.MetadataVersion, error) {
	req, err := cliVersion.Metadata(ctx, u.config.VersionMetadataURL)
	if err != nil {
		return nil, nil, err
	}

	var (
		upgradeTo *goversion.Version
		meta      *version.MetadataVersion
	)
	for _, v := range req.Versions {
		ver, err := goversion.NewVersion(v.Version)
		if err != nil {
			u.l.Debugf("Could not parse version %s. Error: %s", v.Version, err)
			continue
		}

		if currentEverestVersion.GreaterThanOrEqual(ver) {
			continue
		}

		if upgradeTo == nil {
			upgradeTo = ver
			meta = v
			continue
		}

		// Select the latest patch version for the same major and minor version.
		verSeg := ver.Segments()
		uSeg := upgradeTo.Segments()
		if len(verSeg) >= 3 && len(uSeg) >= 3 && verSeg[0] == uSeg[0] && verSeg[1] == uSeg[1] && verSeg[2] > uSeg[2] {
			upgradeTo = ver
			meta = v
			continue
		}

		if upgradeTo.GreaterThan(ver) {
			upgradeTo = ver
			meta = v
			continue
		}
	}

	if upgradeTo == nil {
		return nil, nil, ErrNoUpdateAvailable
	}

	return upgradeTo, meta, nil
}

func (u *Upgrade) verifyRequirements(ctx context.Context, meta *version.MetadataVersion) error {
	supVer, err := u.supportedVersion(meta)
	if err != nil {
		return err
	}

	if err := u.checkRequirements(ctx, supVer); err != nil {
		return err
	}

	return nil
}

func (u *Upgrade) supportedVersion(meta *version.MetadataVersion) (*supportedVersion, error) {
	supVer := &supportedVersion{}

	// Parse MetadataVersion into supportedVersion struct.
	config := map[string]*goversion.Constraints{
		"cli":           &supVer.cli,
		"olm":           &supVer.olm,
		"catalog":       &supVer.catalog,
		"pgOperator":    &supVer.pgOperator,
		"pxcOperator":   &supVer.pxcOperator,
		"psmdbOperator": &supVer.psmdbOperator,
	}
	for key, ref := range config {
		if s, ok := meta.Supported[key]; ok {
			c, err := goversion.NewConstraint(s)
			if err != nil {
				return nil, errors.Join(err, fmt.Errorf("invalid %s constraint %s", key, s))
			}
			*ref = c
		}
	}

	return supVer, nil
}

func (u *Upgrade) checkRequirements(ctx context.Context, supVer *supportedVersion) error {
	// TODO: cli, olm, catalog to be implemented.

	nss, err := u.kubeClient.GetDBNamespaces(ctx, install.SystemNamespace)
	if err != nil {
		return err
	}

	cfg := []requirementsCheck{
		{common.PXCOperatorName, supVer.pxcOperator},
		{common.PGOperatorName, supVer.pgOperator},
		{common.PSMDBOperatorName, supVer.psmdbOperator},
	}

	for _, ns := range nss {
		u.l.Infof("Checking operator requirements in namespace %s", ns)

		// Operator versions.
		for _, c := range cfg {
			v, err := u.kubeClient.OperatorInstalledVersion(ctx, ns, c.operatorName)
			if err != nil && !errors.Is(err, kubernetes.ErrOperatorNotInstalled) {
				return err
			}

			if v == nil {
				u.l.Debugf("Operator %s not found", c.operatorName)
				continue
			}

			u.l.Debugf("Found operator %s version %s. Checking contraints %q", c.operatorName, v, c.constraints.String())
			if !c.constraints.Check(v) {
				return fmt.Errorf(
					"%s version %q does not meet minimum requirements of %q",
					c.operatorName, v, supVer.pxcOperator.String(),
				)
			}
			u.l.Debugf("Finished requirements check for operator %s", c.operatorName)
		}
	}

	return nil
}

func (u *Upgrade) upgradeOLM(ctx context.Context, recommendedVersion *goversion.Version) error {
	if recommendedVersion == nil {
		// No need to check for OLM version and upgrade.
		u.l.Debug("No version provided to upgradeOLM")
		return nil
	}

	u.l.Info("Checking OLM version")
	csv, err := u.kubeClient.GetClusterServiceVersion(ctx, types.NamespacedName{
		Name:      "packageserver",
		Namespace: kubernetes.OLMNamespace,
	})
	if err != nil {
		return errors.Join(err, errors.New("could not retrieve Cluster Service Version"))
	}
	foundVersion, err := goversion.NewVersion(csv.Spec.Version.String())
	if err != nil {
		return err
	}
	u.l.Infof("OLM version is %s. Recommended version is %s", foundVersion, recommendedVersion)
	if !foundVersion.LessThan(recommendedVersion) {
		u.l.Info("OLM version is supported. No action is required.")
		return nil
	}
	u.l.Info("Upgrading OLM to version %s", recommendedVersion)
	// TODO: shall we actually upgrade OLM operator instead of installation/skip?
	if err := u.kubeClient.InstallOLMOperator(ctx, true); err != nil {
		return errors.Join(err, errors.New("could not upgrade OLM"))
	}
	u.l.Info("OLM has been upgraded")

	return nil
}
