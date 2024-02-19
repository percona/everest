package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
)

// GetNamespace returns a namespace.
func (k *Kubernetes) GetNamespace(ctx context.Context, name string) (*corev1.Namespace, error) {
	return k.client.GetNamespace(ctx, name)
}

// DeleteNamespace deletes a namespace.
func (k *Kubernetes) DeleteNamespace(ctx context.Context, name string) error {
	return k.client.DeleteNamespace(ctx, name)
}
