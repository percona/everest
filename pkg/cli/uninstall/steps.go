package uninstall

import (
	"context"
	"fmt"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/cli/helm"
	"github.com/percona/everest/pkg/cli/steps"
	"github.com/percona/everest/pkg/common"
)

func (u *Uninstall) newStepUninstallHelmChart() steps.Step {
	return steps.Step{
		Desc: "Uninstalling Helm chart",
		F: func(ctx context.Context) error {
			return u.uninstallHelmChart(ctx)
		},
	}
}

func (u *Uninstall) newStepDeleteNamespace(ns string) steps.Step {
	return steps.Step{
		Desc: fmt.Sprintf("Deleting namespace '%s'", ns),
		F: func(ctx context.Context) error {
			return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
				err := u.kubeClient.DeleteNamespace(ctx, ns)
				if err != nil {
					if k8serrors.IsNotFound(err) {
						return true, nil
					}
					return false, err
				}
				return false, nil
			})
		},
	}
}

// helm doesn't delete CRDs by default, so we need to handle this manually.
func (u *Uninstall) newStepDeleteCRDs() steps.Step {
	return steps.Step{
		Desc: "Deleting CRDs",
		F: func(ctx context.Context) error {
			return u.deleteEverestCRDs(ctx)
		},
	}
}

func (u *Uninstall) deleteEverestCRDs(ctx context.Context) error {
	crds, err := u.kubeClient.ListCRDs(ctx)
	if err != nil {
		return err
	}
	everestCRDs := []string{}
	for _, crd := range crds.Items {
		if crd.Spec.Group == everestv1alpha1.GroupVersion.Group {
			everestCRDs = append(everestCRDs, crd.Name)
		}
	}
	for _, crd := range everestCRDs {
		u.l.Infof("Deleting CRD '%s'", crd)
		if err := u.kubeClient.DeleteCRD(ctx, crd); client.IgnoreNotFound(err) != nil {
			return err
		}
	}
	return nil
}

func (u *Uninstall) uninstallHelmChart(ctx context.Context) error {
	// First delete the CSVs in monitoring namespace, otherwise the deletion of the namespace will be stuck.
	// TODO: remove this after we install Victoriametrics using its Helm chart.
	if err := wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
		csvs, err := u.kubeClient.ListClusterServiceVersion(ctx, common.MonitoringNamespace)
		if err != nil {
			return false, err
		}
		if len(csvs.Items) == 0 {
			return true, nil
		}
		for _, csv := range csvs.Items {
			if err := u.kubeClient.DeleteClusterServiceVersion(ctx, types.NamespacedName{
				Name:      csv.Name,
				Namespace: csv.Namespace,
			}); err != nil {
				return false, err
			}
		}
		return false, nil
	}); err != nil {
		return err
	}
	// Delete helm chart.
	uninstaller, err := helm.NewUninstaller(common.SystemNamespace, common.SystemNamespace, u.config.KubeconfigPath)
	if err != nil {
		return fmt.Errorf("failed to create Helm uninstaller: %w", err)
	}
	_, err = uninstaller.Uninstall(false)
	if err != nil {
		return fmt.Errorf("failed to uninstall Helm chart: %w", err)
	}
	return nil
}
