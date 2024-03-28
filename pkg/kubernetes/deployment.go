package kubernetes

import (
	"context"

	appsv1 "k8s.io/api/apps/v1"
)

// GetDeployment returns k8s deployment by provided name and namespace.
func (k *Kubernetes) GetDeployment(ctx context.Context, name, namespace string) (*appsv1.Deployment, error) {
	return k.client.GetDeployment(ctx, name, namespace)
}
