package install

import (
	"context"
	"fmt"
	"path"

	"github.com/AlekSi/pointer"
	"github.com/cenkalti/backoff/v4"
	olmv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	"k8s.io/apimachinery/pkg/util/wait"

	"github.com/percona/everest/pkg/cli/helm"
	helmutils "github.com/percona/everest/pkg/cli/helm/utils"
	"github.com/percona/everest/pkg/cli/steps"
	"github.com/percona/everest/pkg/common"
	"github.com/percona/everest/pkg/kubernetes"
)

func (o *Install) newStepInstallEverestHelmChart() steps.Step {
	return steps.Step{
		Desc: "Installing Everest Helm chart",
		F: func(ctx context.Context) error {
			return o.installEverestHelmChart(ctx)
		},
	}
}

func (o *Install) newStepEnsureEverestOperator() steps.Step {
	return steps.Step{
		Desc: "Ensuring Everest operator deployment is ready",
		F: func(ctx context.Context) error {
			return o.waitForDeployment(ctx, common.PerconaEverestOperatorDeploymentName, common.SystemNamespace)
		},
	}
}

func (o *Install) newStepEnsureEverestAPI() steps.Step {
	return steps.Step{
		Desc: "Ensuring Everest API deployment is ready",
		F: func(ctx context.Context) error {
			return o.waitForDeployment(ctx, common.PerconaEverestDeploymentName, common.SystemNamespace)
		},
	}
}

func (o *Install) newStepEnsureEverestOLM() steps.Step {
	return steps.Step{
		Desc: "Ensuring OLM components are ready",
		F: func(ctx context.Context) error {
			depls, err := o.kubeClient.ListDeployments(ctx, kubernetes.OLMNamespace)
			if err != nil {
				return err
			}
			for _, depl := range depls.Items {
				if err := o.kubeClient.WaitForRollout(ctx, depl.GetName(), depl.GetNamespace()); err != nil {
					return err
				}
			}
			return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, false, func(ctx context.Context) (bool, error) {
				cs, err := o.kubeClient.GetCatalogSource(ctx, common.PerconaEverestCatalogName, kubernetes.OLMNamespace)
				if err != nil {
					return false, err
				}
				return pointer.Get(cs.Status.GRPCConnectionState).LastObservedState == "READY", nil
			})
		},
	}
}

func (o *Install) newStepEnsureEverestMonitoring() steps.Step {
	return steps.Step{
		Desc: "Ensuring monitoring is ready",
		F: func(ctx context.Context) error {
			return o.waitForDeployment(ctx, "victoriametrics-operator", common.MonitoringNamespace)
		},
	}
}

func (o *Install) waitForDeployment(ctx context.Context, name, namespace string) error {
	o.l.Infof("Waiting for Deployment '%s' in namespace '%s'", name, namespace)
	if err := o.kubeClient.WaitForRollout(ctx, name, namespace); err != nil {
		return err
	}
	o.l.Infof("Deployment '%s' in namespace '%s' is ready", name, namespace)
	return nil
}

func (o *Install) installEverestHelmChart(ctx context.Context) error {
	nsExists, err := o.namespaceExists(ctx, common.SystemNamespace)
	if err != nil {
		return err
	}
	values := helmutils.MustMergeValues(
		o.config.Values,
		helm.ClusterTypeSpecificValues(o.clusterType),
	)
	installer := helm.Installer{
		ReleaseName:            common.SystemNamespace,
		ReleaseNamespace:       common.SystemNamespace,
		Values:                 values,
		CreateReleaseNamespace: !nsExists,
	}
	if err := installer.Init(o.config.KubeconfigPath, helm.ChartOptions{
		Directory: o.config.ChartDir,
		URL:       o.config.RepoURL,
		Name:      helm.EverestChartName,
		Version:   o.installVersion,
	}); err != nil {
		return fmt.Errorf("could not initialize Helm installer: %w", err)
	}
	o.l.Info("Installing Everest Helm chart")
	if err := installer.Install(ctx); err != nil {
		return fmt.Errorf("could not install Helm chart: %w", err)
	}
	return nil
}

// TODO: remove this after we move to the victoria-metrics Helm chart.
func (o *Install) postChartInstallSteps(ctx context.Context) error {
	// Approve Victoriametrics operator install plan.
	return backoff.Retry(func() error {
		channel := "stable-v0"
		name := "victoriametrics-operator"
		return o.kubeClient.InstallOperator(ctx, kubernetes.InstallOperatorRequest{
			Channel:                channel,
			Name:                   name,
			Namespace:              common.MonitoringNamespace,
			CatalogSource:          common.PerconaEverestCatalogName,
			CatalogSourceNamespace: kubernetes.OLMNamespace,
			OperatorGroup:          common.MonitoringNamespace,
			InstallPlanApproval:    olmv1alpha1.ApprovalManual,
		})
	}, backoff.NewConstantBackOff(backoffInterval),
	)
}

func (o *Install) provisionDBNamespace(ver string, namespace string) steps.Step {
	return steps.Step{
		Desc: fmt.Sprintf("Provisioning DB namespace '%s'", namespace),
		F: func(ctx context.Context) error {
			if err := o.createNamespace(ctx, namespace); err != nil {
				return err
			}
			chartDir := ""
			if o.config.ChartDir != "" {
				chartDir = path.Join(o.config.ChartDir, dbNamespaceSubChartPath)
			}

			values := helmutils.MustMergeValues(
				o.getDBNamespaceInstallValues(),
				helm.ClusterTypeSpecificValues(o.clusterType),
			)

			installer := helm.Installer{
				ReleaseName:            namespace,
				ReleaseNamespace:       namespace,
				Values:                 values,
				CreateReleaseNamespace: false,
			}
			if err := installer.Init(o.config.KubeconfigPath, helm.ChartOptions{
				Directory: chartDir,
				URL:       o.config.RepoURL,
				Name:      helm.EverestDBNamespaceChartName,
				Version:   ver,
			}); err != nil {
				return fmt.Errorf("could not initialize Helm installer: %w", err)
			}

			o.l.Infof("Installing DB namespace Helm chart in namespace ", namespace)
			if err := installer.Install(ctx); err != nil {
				return fmt.Errorf("could not install Helm chart: %w", err)
			}

			if err := o.installDBOperators(ctx, namespace); err != nil {
				return err
			}
			return nil
		},
	}
}
