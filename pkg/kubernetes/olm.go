package kubernetes

import (
	"context"

	"github.com/operator-framework/api/pkg/operators/v1alpha1"
	"k8s.io/apimachinery/pkg/types"
)

// ListInstallPlans lists install plans.
func (k *Kubernetes) ListInstallPlans(ctx context.Context, namespace string) (*v1alpha1.InstallPlanList, error) {
	return k.client.ListInstallPlans(ctx, namespace)
}

// UpdateInstallPlan updates the existing install plan in the specified namespace.
func (k *Kubernetes) UpdateInstallPlan(ctx context.Context, namespace string, installPlan *v1alpha1.InstallPlan) (*v1alpha1.InstallPlan, error) {
	return k.client.UpdateInstallPlan(ctx, namespace, installPlan)
}

// GetSubscriptionCSV returns the CSV name and namespace for the given subscription.
func (k *Kubernetes) GetSubscriptionCSV(ctx context.Context, namespace, name string) (types.NamespacedName, error) {
	return k.client.GetSubscriptionCSV(ctx, types.NamespacedName{
		Namespace: namespace,
		Name:      name,
	})
}
