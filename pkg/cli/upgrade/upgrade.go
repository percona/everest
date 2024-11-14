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
	"io"
	"net/url"
	"os"
	"time"

	version "github.com/Percona-Lab/percona-version-service/versionpb"
	goversion "github.com/hashicorp/go-version"
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/cli/steps"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/helm"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/output"
	cliVersion "github.com/percona/everest/pkg/version"
	versionservice "github.com/percona/everest/pkg/version_service"
)

const (
	pollInterval = 5 * time.Second
	pollTimeout  = 10 * time.Minute

	// FlagSkipEnvDetection is the name of the skip env detection flag.
	FlagSkipEnvDetection = "skip-env-detection"
)

type (
	// Config defines configuration required for upgrade command.
	Config struct {
		// KubeconfigPath is a path to a kubeconfig
		KubeconfigPath string `mapstructure:"kubeconfig"`
		// InCluster is set if the upgrade process should use in-cluster configuration.
		InCluster bool `mapstructure:"in-cluster"`
		// VersionMetadataURL stores hostname to retrieve version metadata information from.
		VersionMetadataURL string `mapstructure:"version-metadata-url"`
		// DryRun is set if the upgrade process should only perform pre-upgrade checks and not perform the actual upgrade.
		DryRun bool `mapstructure:"dry-run"`
		// If set, we will print the pretty output.
		Pretty bool
		// SkipEnvDetection skips detecting the Kubernetes environment.
		SkipEnvDetection bool `mapstructure:"skip-env-detection"`

		helm.CLIOptions
	}

	// Upgrade struct implements upgrade command.
	Upgrade struct {
		l *zap.SugaredLogger

		config         *Config
		kubeClient     kubernetes.KubernetesConnector
		versionService versionservice.Interface
		dryRun         bool

		// these are set on calling Run
		clusterType       kubernetes.ClusterType
		helmReleaseExists bool
		upgradeToVersion  string
		helmInstaller     *helm.Installer
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
	if cfg.Pretty {
		cli.l = zap.NewNop().Sugar()
	}

	var kubeClient kubernetes.KubernetesConnector
	if cfg.InCluster {
		k, err := kubernetes.NewInCluster(cli.l)
		if err != nil {
			return nil, fmt.Errorf("could not create in-cluster kubernetes client: %w", err)
		}
		kubeClient = k
	}
	if cfg.KubeconfigPath != "" {
		k, err := kubernetes.New(cfg.KubeconfigPath, cli.l)
		if err != nil {
			var u *url.Error
			if errors.As(err, &u) {
				l.Error("Could not connect to Kubernetes. " +
					"Make sure Kubernetes is running and is accessible from this computer/server.")
			}
			return nil, err
		}
		kubeClient = k
	}
	if kubeClient == nil {
		return nil, errors.New("must provide kubeconfig path or run in-cluster")
	}

	cli.dryRun = cfg.DryRun
	cli.kubeClient = kubeClient
	cli.versionService = versionservice.New(cfg.VersionMetadataURL)
	return cli, nil
}

func (u *Upgrade) getVersionInfo(ctx context.Context, out io.Writer, everestVersion *goversion.Version) error {
	upgradeEverestTo, err := u.canUpgrade(ctx, everestVersion)
	if err != nil {
		if errors.Is(err, ErrNoUpdateAvailable) {
			u.l.Info("You're running the latest version of Everest")
			fmt.Fprintln(out, "\n", output.Rocket("You're running the latest version of Everest"))
			return nil
		}
		return err
	}
	u.upgradeToVersion = upgradeEverestTo.String()
	return nil
}

func (u *Upgrade) detectKubernetesEnvironment(ctx context.Context) error {
	if u.config.SkipEnvDetection {
		return nil
	}
	t, err := u.kubeClient.GetClusterType(ctx)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}
	u.clusterType = t
	return nil
}

func (u *Upgrade) initHelmInstaller() error {
	installer, err := helm.NewInstaller(common.SystemNamespace, u.config.KubeconfigPath, helm.ChartOptions{
		URL:     u.config.RepoURL,
		Name:    helm.EverestChartName,
		Version: u.upgradeToVersion,
	})
	if err != nil {
		return fmt.Errorf("could not create Helm installer: %w", err)
	}
	u.helmInstaller = installer
	return nil
}

// Run runs the operators installation process.
//
//nolint:funlen
func (u *Upgrade) Run(ctx context.Context) error {
	everestVersion, err := cliVersion.EverestVersionFromDeployment(ctx, u.kubeClient)
	if err != nil {
		return errors.Join(err, errors.New("could not retrieve Everest version"))
	}

	var out io.Writer = os.Stdout
	if !u.config.Pretty {
		out = io.Discard
	}

	if err := u.getVersionInfo(ctx, out, everestVersion); err != nil {
		return err
	}

	if u.dryRun {
		return nil
	}

	if err := u.detectKubernetesEnvironment(ctx); err != nil {
		return fmt.Errorf("could not detect Kubernetes environment: %w", err)
	}

	if err := u.initHelmInstaller(); err != nil {
		return fmt.Errorf("could not initialize Helm installer: %w", err)
	}

	u.l.Infof("Upgrading Everest to %s in namespace %s", u.upgradeToVersion, common.SystemNamespace)

	// 1.4.0 was when Helm based installation was added. Versions below that are not managed by helm.
	u.helmReleaseExists = common.CheckConstraint(everestVersion, ">= 1.4.0")

	upgradeSteps := u.prepareUpgradeSteps()
	if err := steps.RunStepsWithSpinner(ctx, upgradeSteps, out); err != nil {
		return err
	}

	u.l.Infof("Everest has been upgraded to version %s", u.upgradeToVersion)
	return u.printPostUpgradeMessage(ctx, out)
}

func (u *Upgrade) printPostUpgradeMessage(ctx context.Context, out io.Writer) error {
	fmt.Fprintln(out, "\n", output.Rocket("Everest has been upgraded to version %s", u.upgradeToVersion))
	if isSecure, err := u.kubeClient.Accounts().IsSecure(ctx, common.EverestAdminUser); err != nil {
		return errors.Join(err, errors.New("could not check if the admin password is secure"))
	} else if !isSecure {
		fmt.Fprint(os.Stdout, "\n", common.InitialPasswordWarningMessage)
	}
	return nil
}

func (u *Upgrade) prepareUpgradeSteps() []steps.Step {
	return []steps.Step{
		u.newStepUpgradeCRDs(),
		u.newStepUpgradeHelmChart(),
		u.newStepEnsureEverestAPI(),
		u.newStepEnsureEverestOperator(),
	}
}

// ensureManagedByLabelOnDBNamespaces ensures that all database namespaces have the managed-by label set.
// canUpgrade checks if there's a new Everest version available and if we can upgrade to it
// based on minimum requirements.
func (u *Upgrade) canUpgrade(ctx context.Context, everestVersion *goversion.Version) (*goversion.Version, error) {
	u.l.Infof("Current Everest version is %s", everestVersion)

	// Determine version to upgrade to.
	upgradeEverestTo, meta, err := u.versionToUpgradeTo(ctx, everestVersion)
	if err != nil {
		return nil, err
	}

	u.l.Infof("Found available upgrade to Everest version %s", upgradeEverestTo)

	// Check requirements.
	u.l.Infof("Checking requirements for upgrade to Everest %s", upgradeEverestTo)
	if err := u.verifyRequirements(ctx, meta); err != nil {
		return nil, err
	}

	return upgradeEverestTo, nil
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
	supVer, err := common.NewSupportedVersion(meta)
	if err != nil {
		return err
	}

	if err := u.checkRequirements(ctx, supVer); err != nil {
		return err
	}

	return nil
}

func (u *Upgrade) checkRequirements(ctx context.Context, supVer *common.SupportedVersion) error {
	// TODO: olm, catalog to be implemented.

	// cli version check.
	if cliVersion.Version != "" {
		u.l.Infof("Checking cli version requirements")
		cli, err := goversion.NewVersion(cliVersion.Version)
		if err != nil {
			return errors.Join(err, fmt.Errorf("invalid cli version %s", cliVersion.Version))
		}

		// if !supVer.Cli.Check(cli.Core()) {
		// 	return fmt.Errorf(
		// 		"cli version %q does not meet minimum requirements of %q",
		// 		cli, supVer.Cli.String(),
		// 	)
		// }
		u.l.Debugf("cli version %q meets requirements %q", cli, supVer.Cli.String())
	} else {
		u.l.Debug("cli version is empty")
	}

	// Operator version check.
	if err := u.checkOperatorRequirements(ctx, supVer); err != nil {
		return err
	}

	return nil
}

func (u *Upgrade) checkOperatorRequirements(ctx context.Context, supVer *common.SupportedVersion) error {
	nss, err := u.kubeClient.GetDBNamespaces(ctx)
	if err != nil {
		return err
	}

	cfg := []requirementsCheck{
		{common.PXCOperatorName, supVer.PXCOperator},
		{common.PGOperatorName, supVer.PGOperator},
		{common.PSMDBOperatorName, supVer.PSMBDOperator},
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
					c.operatorName, v, supVer.PXCOperator.String(),
				)
			}
			u.l.Debugf("Finished requirements check for operator %s", c.operatorName)
		}
	}
	return nil
}
