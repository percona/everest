package client

import (
	"context"

	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetDeployment returns deployment by name.
func (c *Client) GetDeployment(ctx context.Context, name string, namespace string) (*appsv1.Deployment, error) {
	if namespace == "" {
		namespace = c.namespace
	}
	return c.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
}

// ListDeployments returns deployment by name.
func (c *Client) ListDeployments(ctx context.Context, namespace string) (*appsv1.DeploymentList, error) {
	if namespace == "" {
		namespace = c.namespace
	}
	return c.clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
}

// UpdateDeployment updates a deployment and returns the updated object.
func (c *Client) UpdateDeployment(ctx context.Context, deployment *appsv1.Deployment) (*appsv1.Deployment, error) {
	return c.clientset.AppsV1().Deployments(deployment.GetNamespace()).Update(ctx, deployment, metav1.UpdateOptions{})
}
