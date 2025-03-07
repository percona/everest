package uninstall

import (
	"context"
	"fmt"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	apiextv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"
	"sigs.k8s.io/controller-runtime/pkg/client"

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
				delObj := &corev1.Namespace{
					ObjectMeta: metav1.ObjectMeta{Name: ns},
				}
				err := u.kubeConnector.DeleteNamespace(ctx, delObj)
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
	crds, err := u.kubeConnector.ListCRDs(ctx)
	if err != nil {
		return err
	}
	for _, crd := range crds.Items {
		if crd.Spec.Group == everestv1alpha1.GroupVersion.Group {
			u.l.Infof("Deleting CRD '%s'", crd.Name)
			delObj := &apiextv1.CustomResourceDefinition{
				ObjectMeta: metav1.ObjectMeta{
					Name: crd.Name,
				},
			}
			if err = u.kubeConnector.DeleteCRD(ctx, delObj); client.IgnoreNotFound(err) != nil {
				return err
			}
		}
	}
	return nil
}

func (u *Uninstall) uninstallHelmChart(ctx context.Context) error {
	// First delete the CSVs in monitoring namespace, otherwise the deletion of the namespace will be stuck.
	// TODO: remove this after we install Victoriametrics using its Helm chart.
	if err := u.kubeConnector.DeleteClusterServiceVersions(ctx, client.InNamespace(common.MonitoringNamespace)); err != nil {
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
