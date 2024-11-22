package upgrade

import (
	"context"
	"fmt"

	"helm.sh/helm/v3/pkg/cli/values"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/AlekSi/pointer"
	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/cli/helm"
	helmutils "github.com/percona/everest/pkg/cli/helm/utils"
	"github.com/percona/everest/pkg/cli/steps"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

func (u *Upgrade) newStepUpgradeCRDs() steps.Step {
	return steps.Step{
		Desc: "Upgrading Custom Resource Definitions",
		F: func(ctx context.Context) error {
			return u.upgradeCustomResourceDefinitions(ctx)
		},
	}
}

func (u *Upgrade) newStepUpgradeHelmChart() steps.Step {
	return steps.Step{
		Desc: "Upgrading Helm chart",
		F: func(ctx context.Context) error {
			return u.upgradeHelmChart(ctx)
		},
	}
}

func (u *Upgrade) newStepEnsureEverestOperator() steps.Step {
	return steps.Step{
		Desc: "Ensuring Everest operator deployment is ready",
		F: func(ctx context.Context) error {
			return u.waitForDeployment(ctx, common.PerconaEverestOperatorDeploymentName, common.SystemNamespace)
		},
	}
}

func (u *Upgrade) newStepEnsureEverestAPI() steps.Step {
	return steps.Step{
		Desc: "Ensuring Everest API deployment is ready",
		F: func(ctx context.Context) error {
			return u.waitForDeployment(ctx, common.PerconaEverestDeploymentName, common.SystemNamespace)
		},
	}
}

func (u *Upgrade) newStepEnsureCatalogSource() steps.Step {
	return steps.Step{
		Desc: "Ensuring Everest CatalogSource is ready",
		F: func(ctx context.Context) error {
			manifest, err := u.helmInstaller.RenderTemplates(ctx)
			if err != nil {
				return fmt.Errorf("could not render Helm templates: %w", err)
			}
			catalogNs, err := manifest.GetEverestCatalogNamespace()
			return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
				cs, err := u.kubeClient.GetCatalogSource(ctx, common.PerconaEverestCatalogName, catalogNs)
				if err != nil {
					return false, fmt.Errorf("cannot get CatalogSource: %w", err)
				}
				return pointer.Get(cs.Status.GRPCConnectionState).LastObservedState == "READY", nil
			})
		},
	}
}

func (u *Upgrade) waitForDeployment(ctx context.Context, name, namespace string) error {
	u.l.Infof("Waiting for Deployment '%s' in namespace '%s'", name, namespace)
	if err := u.kubeClient.WaitForRollout(ctx, name, namespace); err != nil {
		return err
	}
	u.l.Infof("Deployment '%s' in namespace '%s' is ready", name, namespace)
	return nil
}

func (u *Upgrade) upgradeCustomResourceDefinitions(ctx context.Context) error {
	manifests, err := u.helmInstaller.RenderTemplates(ctx)
	if err != nil {
		return fmt.Errorf("could not render Helm templates: %w", err)
	}
	crds, err := manifests.GetCRDs()
	if err != nil {
		return fmt.Errorf("could not get CRDs: %w", err)
	}
	return u.kubeClient.ApplyManifestFile(helmutils.YAMLStringsToBytes(crds), common.SystemNamespace)
}

func (u *Upgrade) upgradeHelmChart(ctx context.Context) error {
	// We're already using the Helm chart, directly upgrade and return.
	if u.helmReleaseExists {
		u.l.Info("Upgrading Helm chart")
		return u.helmInstaller.Upgrade(ctx)
	}

	// We're on the legacy installation.
	// Perform migration of the existing resources to Helm.
	u.l.Info("Migrating existing installation to Helm")
	if err := u.cleanupLegacyResources(ctx); err != nil {
		return fmt.Errorf("failed to cleanupLegacyResources: %w", err)
	}
	if err := u.helmInstaller.Install(ctx); err != nil {
		return fmt.Errorf("failed to install Helm chart: %w", err)
	}
	dbNamespaces, err := u.kubeClient.GetDBNamespaces(ctx)
	if err != nil {
		return fmt.Errorf("could not get database namespaces: %w", err)
	}
	for _, ns := range dbNamespaces {
		if err := u.helmAdoptDBNamespaces(ctx, ns, u.upgradeToVersion); err != nil {
			return fmt.Errorf("could not migrate DB namespace '%s' installation to Helm: %w", ns, err)
		}
	}
	return nil
}

// Creates an installation of the `everest-db-namespace` Helm chart for the given DB namesapce
// and adopts its resources.
func (u *Upgrade) helmAdoptDBNamespaces(ctx context.Context, namespace, version string) error {
	dbEngines, err := u.kubeClient.ListDatabaseEngines(ctx, namespace)
	if err != nil {
		return fmt.Errorf("cannot list database engines in namespace %s: %w", namespace, err)
	}
	overrides := helm.NewValues(helm.Values{
		ClusterType:        u.clusterType,
		VersionMetadataURL: u.config.VersionMetadataURL,
	})
	values := helmutils.MustMergeValues(helmValuesForDBEngines(dbEngines), overrides)
	installer := helm.Installer{
		ReleaseName:      namespace,
		ReleaseNamespace: namespace,
		Values:           values,
	}
	if err := installer.Init(u.config.KubeconfigPath, helm.ChartOptions{
		URL:     u.config.RepoURL,
		Name:    helm.EverestDBNamespaceChartName,
		Version: version,
	}); err != nil {
		return fmt.Errorf("could not initialize Helm installer: %w", err)
	}
	return installer.Install(ctx)
}

func helmValuesForDBEngines(list *everestv1alpha1.DatabaseEngineList) values.Options {
	vals := []string{}
	for _, dbEngine := range list.Items {
		t := dbEngine.Spec.Type
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
	if err := deleteOLMOperator(ctx, u.kubeClient, common.EverestOperatorName, common.SystemNamespace); err != nil {
		return fmt.Errorf("could not delete Everest operator: %w", err)
	}
	// Delete resources related to victoria metrics operator Subscription.
	if err := deleteOLMOperator(ctx, u.kubeClient, "victoriametrics-operator", common.MonitoringNamespace); err != nil {
		return fmt.Errorf("could not delete victoria metrics operator: %w", err)
	}
	if err := u.kubeClient.DeleteDeployment(ctx, "percona-everest", common.SystemNamespace); client.IgnoreNotFound(err) != nil {
		return fmt.Errorf("could not delete percona-everest deployment: %w", err)
	}
	return nil
}

// deleteOLMOperator deletes the subscription and current installed CSV.
func deleteOLMOperator(ctx context.Context, k kubernetes.KubernetesConnector, subscription, namespace string) error {
	currentCSV := ""
	if err := wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
		key := types.NamespacedName{Name: subscription, Namespace: namespace}
		sub, err := k.GetSubscription(ctx, key.Name, key.Namespace)
		if err != nil {
			if k8serrors.IsNotFound(err) {
				return true, nil
			}
			return false, err
		}
		currentCSV = sub.Status.InstalledCSV
		return false, k.DeleteSubscription(ctx, key)
	}); err != nil {
		return err
	}
	if currentCSV != "" {
		if err := wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
			if err := k.DeleteClusterServiceVersion(ctx, types.NamespacedName{
				Namespace: namespace,
				Name:      currentCSV,
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
