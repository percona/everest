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
	"os"
	"time"

	version "github.com/Percona-Lab/percona-version-service/versionpb"
	"github.com/cenkalti/backoff/v4"
	goversion "github.com/hashicorp/go-version"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
	cliVersion "github.com/percona/everest/pkg/version"
	versionservice "github.com/percona/everest/pkg/version_service"
)

// list of objects to skip during upgrade.
var skipObjects = []client.Object{ //nolint:gochecknoglobals
	&corev1.Secret{
		TypeMeta: metav1.TypeMeta{
			Kind: "Secret",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      common.EverestJWTSecretName,
			Namespace: common.SystemNamespace,
		},
	},
	&corev1.Secret{
		TypeMeta: metav1.TypeMeta{
			Kind: "Secret",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      common.EverestAccountsSecretName,
			Namespace: common.SystemNamespace,
		},
	},
}

const postUpgradeMessage = `
Everest has been successfully upgraded!


To view the password for the 'admin' user, run the following command:

everestctl accounts initial-admin-password


IMPORTANT: This password is NOT stored in a hashed format. To secure it, update the password using the following command:

everestctl accounts set-password --username admin
`

type (
	// Config defines configuration required for upgrade command.
	Config struct {
		// KubeconfigPath is a path to a kubeconfig
		KubeconfigPath string `mapstructure:"kubeconfig"`
		// VersionMetadataURL stores hostname to retrieve version metadata information from.
		VersionMetadataURL string `mapstructure:"version-metadata-url"`
	}

	// Upgrade struct implements upgrade command.
	Upgrade struct {
		l *zap.SugaredLogger

		config         *Config
		kubeClient     kubernetes.KubernetesConnector
		versionService versionservice.Interface
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

// ErrNoUpdateAvailable is returned when no update is available.
var ErrNoUpdateAvailable = errors.New("no update available")

// NewUpgrade returns a new Upgrade struct.
func NewUpgrade(cfg *Config, l *zap.SugaredLogger) (*Upgrade, error) {
	cli := &Upgrade{
		config: cfg,
		l:      l.With("component", "upgrade"),
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
	cli.versionService = versionservice.New(cfg.VersionMetadataURL)
	return cli, nil
}

// Run runs the operators installation process.
//
//nolint:funlen,cyclop
func (u *Upgrade) Run(ctx context.Context) error {
	// Get Everest version.
	everestVersion, err := cliVersion.EverestVersionFromDeployment(ctx, u.kubeClient)
	if err != nil {
		return errors.Join(err, errors.New("could not retrieve Everest version"))
	}

	// Check prerequisites
	upgradeEverestTo, recVer, err := u.canUpgrade(ctx, everestVersion)
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
	catalogVersion := recVer.Catalog
	if catalogVersion == nil {
		u.l.Debugf("Percona catalog version was nil. Changing to %s", upgradeEverestTo)
		catalogVersion = upgradeEverestTo
	}
	u.l.Infof("Upgrading Percona Catalog to %s", catalogVersion)
	if err := u.kubeClient.InstallPerconaCatalog(ctx, catalogVersion); err != nil {
		return err
	}

	// Locate the correct install plan.
	ctxTimeout, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	u.l.Info("Waiting for install plan for Everest operator")
	ip, err := u.kubeClient.WaitForInstallPlan(
		ctxTimeout, common.SystemNamespace,
		common.EverestOperatorName, upgradeEverestTo,
	)
	if err != nil {
		return errors.Join(err, errors.New("could not find install plan"))
	}

	if common.CompareVersions(upgradeEverestTo, "0.10.1") > 0 {
		if err := u.ensureEverestJWTIfNotExists(ctx); err != nil {
			return err
		}
	}

	u.l.Infof("Upgrading Everest to %s in namespace %s", upgradeEverestTo, common.SystemNamespace)

	// During upgrades, we will skip re-applying the JWT secret since we do not want it to change.
	if err := u.kubeClient.InstallEverest(ctx, common.SystemNamespace, upgradeEverestTo, skipObjects...); err != nil {
		return err
	}

	if err := u.upgradeEverestOperator(ctx, ip.Name); err != nil {
		return err
	}

	u.l.Infof("Everest has been upgraded to version %s", upgradeEverestTo)

	if common.CompareVersions(upgradeEverestTo, "0.10.1") > 0 {
		if err := u.ensureEverestAccountsIfNotExists(ctx); err != nil {
			return err
		}
		if err := u.ensureManagedByLabelOnDBNamespaces(ctx); err != nil {
			return err
		}
		if err := u.kubeClient.DeleteSecret(ctx, common.SystemNamespace, "everest-token"); client.IgnoreNotFound(err) != nil {
			return err
		}
		if err := u.kubeClient.DeleteSecret(ctx, common.SystemNamespace, "everest-admin-token"); client.IgnoreNotFound(err) != nil {
			return err
		}
	}

	if isSecure, err := u.kubeClient.Accounts().IsSecure(ctx, common.EverestAdminUser); err != nil {
		return errors.Join(err, errors.New("could not check if the admin password is secure"))
	} else if !isSecure {
		fmt.Fprint(os.Stderr, postUpgradeMessage)
	}

	return nil
}

// ensureManagedByLabelOnDBNamespaces ensures that all database namespaces have the managed-by label set.
func (u *Upgrade) ensureManagedByLabelOnDBNamespaces(ctx context.Context) error {
	dbNamespaces, err := u.kubeClient.GetDBNamespaces(ctx, common.SystemNamespace)
	if err != nil {
		u.l.Error(err)
		return errors.Join(err, errors.New("could not retrieve database namespaces"))
	}
	for _, nsName := range dbNamespaces {
		// Ensure we add the managed-by label to the namespace.
		// We should retry this operation since there may be update conflicts.
		var b backoff.BackOff
		b = backoff.NewConstantBackOff(5 * time.Second)
		b = backoff.WithMaxRetries(b, 5)
		b = backoff.WithContext(b, ctx)
		if err := backoff.Retry(func() error {
			// Get the namespace.
			ns, err := u.kubeClient.GetNamespace(ctx, nsName)
			if err != nil {
				return errors.Join(err, fmt.Errorf("could not get namespace '%s'", nsName))
			}
			labels := ns.GetLabels()
			_, found := labels[common.KubernetesManagedByLabel]
			if found {
				return nil // label already exists.
			}
			if labels == nil {
				labels = make(map[string]string)
			}
			// Set the label.
			labels[common.KubernetesManagedByLabel] = common.Everest
			ns.SetLabels(labels)
			if _, err := u.kubeClient.UpdateNamespace(ctx, ns, metav1.UpdateOptions{}); err != nil {
				return errors.Join(err, fmt.Errorf("could not update namespace '%s'", nsName))
			}
			return nil
		}, b,
		); err != nil {
			return err
		}
	}
	return nil
}

func (u *Upgrade) ensureEverestAccountsIfNotExists(ctx context.Context) error {
	if _, err := u.kubeClient.GetSecret(ctx, common.SystemNamespace, common.EverestAccountsSecretName); client.IgnoreNotFound(err) != nil {
		return err
	} else if err == nil {
		return nil // Everest accounts already exists.
	}

	// Create Everest accounts secret.
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      common.EverestAccountsSecretName,
			Namespace: common.SystemNamespace,
		},
	}
	if _, err := u.kubeClient.CreateSecret(ctx, secret); err != nil {
		return err
	}
	return common.CreateInitialAdminAccount(ctx, u.kubeClient.Accounts())
}

func (u *Upgrade) ensureEverestJWTIfNotExists(ctx context.Context) error {
	if _, err := u.kubeClient.GetSecret(ctx, common.SystemNamespace, common.EverestJWTSecretName); client.IgnoreNotFound(err) != nil {
		return err
	} else if err == nil {
		return nil // JWT keys already exist.
	}
	return u.kubeClient.CreateRSAKeyPair(ctx)
}

// canUpgrade checks if there's a new Everest version available and if we can upgrade to it
// based on minimum requirements.
func (u *Upgrade) canUpgrade(ctx context.Context, everestVersion *goversion.Version) (*goversion.Version, *cliVersion.RecommendedVersion, error) {
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
	req, err := u.versionService.GetEverestMetadata(ctx)
	if err != nil {
		return nil, nil, err
	}

	upgradeTo, meta := u.findNextMinorVersion(req, currentEverestVersion)
	if upgradeTo == nil {
		upgradeTo = currentEverestVersion
	}

	// Find the latest patch version for the given minor version.
	for _, v := range req.GetVersions() {
		ver, err := goversion.NewVersion(v.GetVersion())
		if err != nil {
			u.l.Debugf("Could not parse version %s. Error: %s", v.GetVersion(), err)
			continue
		}

		if currentEverestVersion.GreaterThanOrEqual(ver) {
			continue
		}

		// Select the latest patch version for the same major and minor version.
		verSeg := ver.Segments()
		uSeg := upgradeTo.Segments()
		if len(verSeg) >= 3 && len(uSeg) >= 3 && verSeg[0] == uSeg[0] && verSeg[1] == uSeg[1] {
			if verSeg[2] <= uSeg[2] {
				continue
			}
			upgradeTo = ver
			meta = v
			continue
		}
	}

	if upgradeTo == nil || meta == nil {
		return nil, nil, ErrNoUpdateAvailable
	}

	return upgradeTo, meta, nil
}

func (u *Upgrade) findNextMinorVersion(
	req *version.MetadataResponse, currentEverestVersion *goversion.Version,
) (*goversion.Version, *version.MetadataVersion) {
	var (
		upgradeTo *goversion.Version
		meta      *version.MetadataVersion
	)

	for _, v := range req.GetVersions() {
		ver, err := goversion.NewVersion(v.GetVersion())
		if err != nil {
			u.l.Debugf("Could not parse version %s. Error: %s", v.GetVersion(), err)
			continue
		}

		if currentEverestVersion.GreaterThanOrEqual(ver) {
			continue
		}

		verSeg := ver.Segments()
		evSeg := currentEverestVersion.Segments()
		if len(verSeg) >= 3 && len(evSeg) >= 3 && verSeg[0] == evSeg[0] && verSeg[1] == evSeg[1] {
			continue
		}

		if upgradeTo == nil {
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

	return upgradeTo, meta
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
		if s, ok := meta.GetSupported()[key]; ok {
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
	// TODO: olm, catalog to be implemented.

	// cli version check.
	if cliVersion.Version != "" {
		u.l.Infof("Checking cli version requirements")
		cli, err := goversion.NewVersion(cliVersion.Version)
		if err != nil {
			return errors.Join(err, fmt.Errorf("invalid cli version %s", cliVersion.Version))
		}

		if !supVer.cli.Check(cli.Core()) {
			return fmt.Errorf(
				"cli version %q does not meet minimum requirements of %q",
				cli, supVer.cli.String(),
			)
		}
		u.l.Debugf("cli version %q meets requirements %q", cli, supVer.cli.String())
	} else {
		u.l.Debug("cli version is empty")
	}

	nss, err := u.kubeClient.GetDBNamespaces(ctx, common.SystemNamespace)
	if err != nil {
		return err
	}

	// Operator version check.
	cfg := []requirementsCheck{
		{common.PXCOperatorName, supVer.pxcOperator},
		{common.PGOperatorName, supVer.pgOperator},
		{common.PSMDBOperatorName, supVer.psmdbOperator},
	}
	for _, ns := range nss {
		u.l.Infof("Checking operator requirements in namespace %s", ns)

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
	if err := u.kubeClient.InstallOLMOperator(ctx, true); err != nil {
		return errors.Join(err, errors.New("could not upgrade OLM"))
	}
	u.l.Info("OLM has been upgraded")

	return nil
}

func (u *Upgrade) upgradeEverestOperator(ctx context.Context, installPlanName string) error {
	u.l.Infof("Approving install plan %s for Everest operator", installPlanName)
	done, err := u.kubeClient.ApproveInstallPlan(ctx, common.SystemNamespace, installPlanName)
	if err != nil || !done {
		return errors.Join(err, fmt.Errorf("could not approve install plan %s", installPlanName))
	}

	u.l.Infof("Waiting for install plan installation of Everest operator to finish")
	if err := u.kubeClient.WaitForInstallPlanCompleted(ctx, common.SystemNamespace, installPlanName); err != nil {
		return errors.Join(err, fmt.Errorf("install plan %s is not in phase completed", installPlanName))
	}

	return nil
}
