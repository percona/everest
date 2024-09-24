package client

import (
	"context"

	olmv1alpha1 "github.com/operator-framework/api/pkg/operators/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetInstallPlan retrieves an OLM install plan by namespace and name.
func (c *Client) GetInstallPlan(ctx context.Context, namespace string, name string) (*olmv1alpha1.InstallPlan, error) {
	c.rcLock.Lock()
	defer c.rcLock.Unlock()

	return c.olmClientset.OperatorsV1alpha1().InstallPlans(namespace).Get(ctx, name, metav1.GetOptions{})
}

// ListInstallPlans lists install plans.
func (c *Client) ListInstallPlans(ctx context.Context, namespace string) (*olmv1alpha1.InstallPlanList, error) {
	c.rcLock.Lock()
	defer c.rcLock.Unlock()

	return c.olmClientset.OperatorsV1alpha1().InstallPlans(namespace).List(ctx, metav1.ListOptions{})
}

// UpdateInstallPlan updates the existing install plan in the specified namespace.
func (c *Client) UpdateInstallPlan(
	ctx context.Context,
	namespace string,
	installPlan *olmv1alpha1.InstallPlan,
) (*olmv1alpha1.InstallPlan, error) {
	c.rcLock.Lock()
	defer c.rcLock.Unlock()

	return c.olmClientset.OperatorsV1alpha1().InstallPlans(namespace).Update(ctx, installPlan, metav1.UpdateOptions{})
}
