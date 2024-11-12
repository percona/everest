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
	"helm.sh/helm/v3/pkg/cli/values"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/helm"
	"github.com/percona/everest/pkg/install"
	"github.com/percona/everest/pkg/kubernetes"
	"github.com/percona/everest/pkg/output"
	cliVersion "github.com/percona/everest/pkg/version"
	versionservice "github.com/percona/everest/pkg/version_service"
)

const (
	contextTimeout    = 5 * time.Minute
	backoffInterval   = 5 * time.Second
	backoffMaxRetries = 5

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
		clusterType    kubernetes.ClusterType
		helmInstaller  *helm.Installer

		// We use this flag to check if the existing installation of Everest
		// was done using the Helm chart.
		// This way we can determine if we need to migrate legacy installations
		// to the Helm chart.
		helmReleaseExists bool
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

// Run runs the operators installation process.
//
//nolint:funlen,cyclop,gocognit
func (u *Upgrade) Run(ctx context.Context) error {
	// Get Everest version.
	everestVersion, err := cliVersion.EverestVersionFromDeployment(ctx, u.kubeClient)
	if err != nil {
		return errors.Join(err, errors.New("could not retrieve Everest version"))
	}

	var out io.Writer = os.Stdout
	if !u.config.Pretty {
		out = io.Discard
	}

	// Check prerequisites
	upgradeEverestTo, err := u.canUpgrade(ctx, everestVersion)
	if err != nil {
		if errors.Is(err, ErrNoUpdateAvailable) {
			u.l.Info("You're running the latest version of Everest")
			fmt.Fprintln(out, "\n", output.Rocket("You're running the latest version of Everest"))
			return nil
		}
		return err
	}

	if u.dryRun {
		return nil
	}

	// Detect Kubernetes environment.
	if !u.config.SkipEnvDetection {
		t, err := u.kubeClient.GetClusterType(ctx)
		if err != nil {
			return fmt.Errorf("failed to detect cluster type: %w", err)
		}
		u.clusterType = t
	}

	// Initialise installer.
	installer, err := helm.NewInstaller(common.SystemNamespace, u.config.KubeconfigPath, helm.ChartOptions{
		URL:     u.config.RepoURL,
		Name:    helm.EverestChartName,
		Version: upgradeEverestTo.String(),
	})
	if err != nil {
		return fmt.Errorf("could not create Helm installer: %w", err)
	}
	u.helmInstaller = installer

	u.l.Infof("Upgrading Everest to %s in namespace %s", upgradeEverestTo, common.SystemNamespace)

	// 1.4.0 was when Helm based installation was added. Versions below that are not managed by helm.
	u.helmReleaseExists = common.CheckConstraint(everestVersion, ">= 1.4.0")

	upgradeSteps := []common.Step{}
	upgradeSteps = append(upgradeSteps, u.upgradeCRDs())
	upgradeSteps = append(upgradeSteps, u.upgradeEverestHelmChart(upgradeEverestTo.String()))
	upgradeSteps = append(upgradeSteps, install.WaitForEverestSteps(u.l, u.kubeClient, u.clusterType)...)

	if err := common.RunStepsWithSpinner(ctx, upgradeSteps, out); err != nil {
		return err
	}

	u.l.Infof("Everest has been upgraded to version %s", upgradeEverestTo)
	fmt.Fprintln(out, "\n", output.Rocket("Everest has been upgraded to version %s", upgradeEverestTo))

	if isSecure, err := u.kubeClient.Accounts().IsSecure(ctx, common.EverestAdminUser); err != nil {
		return errors.Join(err, errors.New("could not check if the admin password is secure"))
	} else if !isSecure {
		fmt.Fprint(os.Stdout, "\n", common.InitialPasswordWarningMessage)
	}

	return nil
}

func (u *Upgrade) upgradeCRDs() common.Step {
	return common.Step{
		Desc: "Upgrade CRDs",
		F: func(ctx context.Context) error {
			files, err := u.helmInstaller.RenderTemplates(ctx, false, helm.InstallArgs{
				ReleaseName: common.SystemNamespace,
			})
			if err != nil {
				return fmt.Errorf("could not render Helm templates: %w", err)
			}
			crds := files.Filter("crds")
			return u.kubeClient.ApplyManifestFile(crds, common.SystemNamespace)
		},
	}
}

func (u *Upgrade) upgradeEverestHelmChart(version string) common.Step {
	return common.Step{
		Desc: "Upgrade Everest Helm chart",
		F: func(ctx context.Context) error {
			values := helm.MustMergeValues(
				u.config.Values,
				helm.ClusterTypeSpecificValues(u.clusterType),
			)
			args := helm.InstallArgs{
				Values:      values,
				ReleaseName: common.SystemNamespace,
			}

			// We're already using the Helm chart, directly upgrade and return.
			if u.helmReleaseExists {
				u.l.Info("Upgrading Helm chart")
				return u.helmInstaller.Upgrade(ctx, args)
			}

			// We're on the legacy installation.
			// Perform migration of the existing resources to Helm.
			u.l.Info("Migrating existing installation to Helm")
			if err := u.cleanupLegacyResources(ctx); err != nil {
				return fmt.Errorf("failed to cleanupLegacyResources: %w", err)
			}
			if err := u.helmInstaller.Install(ctx, args); err != nil {
				return fmt.Errorf("failed to install Helm chart: %w", err)
			}
			dbNamespaces, err := u.kubeClient.GetDBNamespaces(ctx)
			if err != nil {
				return fmt.Errorf("could not get database namespaces: %w", err)
			}
			for _, ns := range dbNamespaces {
				if err := u.helmAdoptDBNamespaces(ctx, ns, version); err != nil {
					return fmt.Errorf("could not migrate DB namespace '%s' installation to Helm: %w", ns, err)
				}
			}
			return nil
		},
	}
}

// Creates an installation of the `everest-db-namespace` Helm chart for the given DB namesapce
// and adopts its resources.
func (u *Upgrade) helmAdoptDBNamespaces(ctx context.Context, namespace, version string) error {
	installer, err := helm.NewInstaller(namespace, u.config.KubeconfigPath, helm.ChartOptions{
		URL:     u.config.RepoURL,
		Name:    helm.EverestDBNamespaceChartName,
		Version: version,
	})
	if err != nil {
		return fmt.Errorf("could not create Helm installer: %w", err)
	}
	dbEngines, err := u.kubeClient.ListDatabaseEngines(ctx, namespace)
	if err != nil {
		return fmt.Errorf("cannot list database engines in namespace %s: %w", namespace, err)
	}
	values := helm.MustMergeValues(
		helmValuesForDBEngines(dbEngines),
		helm.ClusterTypeSpecificValues(u.clusterType),
	)
	return installer.Install(ctx, helm.InstallArgs{
		Values:          values,
		CreateNamespace: false,
		ReleaseName:     namespace,
	})
}

func helmValuesForDBEngines(list *everestv1alpha1.DatabaseEngineList) values.Options {
	vals := []string{}
	for _, dbEngine := range list.Items {
		t := dbEngine.Spec.Type
		if t == everestv1alpha1.DatabaseEnginePostgresql {
			t = "pg" // TODO: Helm chart should use postgresql.
		}
		vals = append(vals, fmt.Sprintf("%s=%t", t, dbEngine.Status.State == everestv1alpha1.DBEngineStateInstalled))
	}
	// TODO: figure out how to set telemetry.
	return values.Options{Values: vals}
}

// cleanupLegacyResources removes resources that were created as a part of the legacy installation method
// and no longer exist as a part of the Helm chart.
func (u *Upgrade) cleanupLegacyResources(ctx context.Context) error {
	// Delete OLM PackageServer CSV.
	if err := wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
		if err := u.kubeClient.DeleteClusterServiceVersion(ctx, types.NamespacedName{
			Namespace: kubernetes.OLMNamespace,
			Name:      "packageserver",
		}); err != nil {
			if k8serrors.IsNotFound(err) {
				return true, nil
			}
			return false, err
		}
		return false, nil
	}); err != nil {
		return err
	}

	// Delete resources related to Everest Operator Subscription.
	everestOperatorCurrentCSV := ""
	if err := wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
		key := types.NamespacedName{Name: "everest-operator", Namespace: common.SystemNamespace}
		sub, err := u.kubeClient.GetSubscription(ctx, key.Name, key.Namespace)
		if err != nil {
			if k8serrors.IsNotFound(err) {
				return true, nil
			}
			return false, err
		}
		everestOperatorCurrentCSV = sub.Status.InstalledCSV
		return false, u.kubeClient.DeleteSubscription(ctx, key)
	}); err != nil {
		return err
	}

	if everestOperatorCurrentCSV != "" {
		if err := wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
			if err := u.kubeClient.DeleteClusterServiceVersion(ctx, types.NamespacedName{
				Namespace: common.SystemNamespace,
				Name:      everestOperatorCurrentCSV,
			}); err != nil {
				if k8serrors.IsNotFound(err) {
					return true, nil
				}
				return false, err
			}
			return false, nil
		}); err != nil {
			return err
		}
	}
	return nil
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

	// Kubernetes version check
	if err := common.CheckK8sRequirements(supVer, u.l, u.kubeClient); err != nil {
		return err
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
