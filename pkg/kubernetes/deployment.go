package kubernetes

import (
	"context"

	appv1 "k8s.io/api/apps/v1"
)

// Deployment returns a deployment.
func (k *Kubernetes) Deployment(ctx context.Context, namespace, name string) (*appv1.Deployment, error) {
	return k.client.GetDeployment(ctx, name, namespace)
}
