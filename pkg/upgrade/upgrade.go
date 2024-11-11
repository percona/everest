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
	"strings"
	"time"

	"github.com/AlekSi/pointer"
	version "github.com/Percona-Lab/percona-version-service/versionpb"
	"github.com/cenkalti/backoff/v4"
	goversion "github.com/hashicorp/go-version"
	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"go.uber.org/zap"
	"helm.sh/helm/v3/pkg/cli/values"
	"helm.sh/helm/v3/pkg/storage/driver"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/helm"
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
	upgradeEverestTo, _, err := u.canUpgrade(ctx, everestVersion)
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

	// Check if current installation was done using Helm chart.
	if err := u.checkExistingHelmRelease(); err != nil {
		return fmt.Errorf("could not check existing Helm release: %w", err)
	}

	u.l.Infof("Upgrading Everest to %s in namespace %s", upgradeEverestTo, common.SystemNamespace)

	upgradeSteps := []common.Step{}
	upgradeSteps = append(upgradeSteps, u.upgradeCRDs())
	upgradeSteps = append(upgradeSteps, u.upgradeEverestHelmChart(upgradeEverestTo.String()))
	upgradeSteps = append(upgradeSteps, u.waitForEverestAPI())
	upgradeSteps = append(upgradeSteps, u.waitForEverestOperator())
	if u.clusterType != kubernetes.ClusterTypeOpenShift {
		upgradeSteps = append(upgradeSteps, u.waitForOLM())
	}

	upgradeSteps = append(upgradeSteps, common.Step{
		Desc: "Run post-upgrade tasks",
		F: func(ctx context.Context) error {
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
			if common.CheckConstraint(upgradeEverestTo, "~> 1.2.0") {
				// Migrate monitoring-configs and backup-storages.
				if err := u.migrateSharedResources(ctx); err != nil {
					return fmt.Errorf("migration of shared resources failed: %w", err)
				}
			}
			return nil
		},
	})

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
			crds := files.FilterFiles("crds")
			bldr := &strings.Builder{}
			for _, f := range crds {
				bldr.WriteString(f)
				bldr.WriteString("\n---\n")
			}
			b := strings.Trim(bldr.String(), "\n---\n")
			return u.kubeClient.ApplyManifestFile([]byte(b), common.SystemNamespace)
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

			// We're on the legacy installation. Perform migration of the existing resources
			// to Helm.
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
		vals = append(vals, fmt.Sprintf("%s=%t", dbEngine.Name, dbEngine.Status.State == everestv1alpha1.DBEngineStateInstalled))
	}
	// todo: figure out how to set telemetry.
	return values.Options{Values: vals}
}

// cleanupLegacyResources removes resources that were created as a part of the legacy installation method
// and no longer exist as a part of the Helm chart.
func (u *Upgrade) cleanupLegacyResources(ctx context.Context) error {
	pollInterval := 5 * time.Second
	pollTimeout := 5 * time.Minute
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
func (u *Upgrade) ensureManagedByLabelOnDBNamespaces(ctx context.Context) error {
	dbNamespaces, err := u.kubeClient.GetDBNamespaces(ctx)
	if err != nil {
		u.l.Error(err)
		return errors.Join(err, errors.New("could not retrieve database namespaces"))
	}
	for _, nsName := range dbNamespaces {
		// Ensure we add the managed-by label to the namespace.
		// We should retry this operation since there may be update conflicts.
		var b backoff.BackOff
		b = backoff.NewConstantBackOff(backoffInterval)
		b = backoff.WithMaxRetries(b, backoffMaxRetries)
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

func (u *Upgrade) checkExistingHelmRelease() error {
	getter, err := helm.NewGetter(common.SystemNamespace, u.config.KubeconfigPath)
	if err != nil {
		return fmt.Errorf("could not create Helm getter: %w", err)
	}
	_, err = getter.Get(common.SystemNamespace)
	if err != nil {
		if !errors.Is(err, driver.ErrReleaseNotFound) {
			return fmt.Errorf("could not get Helm release: %w", err)
		}
		return nil
	}
	u.helmReleaseExists = true
	return nil
}

func (u *Upgrade) waitForOLM() common.Step {
	return common.Step{
		Desc: "Wait for Operator Lifecycle Manager",
		F: func(ctx context.Context) error {
			u.l.Infof("Waiting for OLM to be ready")
			// Wait for all the Deployments to come up.
			depls, err := u.kubeClient.ListDeployments(ctx, kubernetes.OLMNamespace)
			if err != nil {
				return err
			}
			for _, depl := range depls.Items {
				if err := u.kubeClient.WaitForRollout(ctx, depl.GetName(), depl.GetNamespace()); err != nil {
					return err
				}
			}
			return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
				cs, err := u.kubeClient.GetCatalogSource(ctx, common.PerconaEverestCatalogName, kubernetes.OLMNamespace)
				if err != nil {
					return false, err
				}
				return pointer.Get(cs.Status.GRPCConnectionState).LastObservedState == "READY", nil
			})
		},
	}
}

// wait for Everst operator deployment to come up.
func (u *Upgrade) waitForEverestOperator() common.Step {
	return common.Step{
		Desc: "Wait for Everest Operator Deployment",
		F: func(ctx context.Context) error {
			u.l.Infof("Waiting for Deployment '%s' in namespace '%s'", common.PerconaEverestOperatorDeploymentName, common.SystemNamespace)
			return u.kubeClient.WaitForRollout(ctx, common.PerconaEverestOperatorDeploymentName, common.SystemNamespace)
		},
	}
}

// wait for Everst API deployment to come up.
func (u *Upgrade) waitForEverestAPI() common.Step {
	return common.Step{
		Desc: "Wait for Everest API Deployment",
		F: func(ctx context.Context) error {
			u.l.Infof("Waiting for Deployment '%s' in namespace '%s'", common.PerconaEverestDeploymentName, common.SystemNamespace)
			return u.kubeClient.WaitForRollout(ctx, common.PerconaEverestDeploymentName, common.SystemNamespace)
		},
	}
}
