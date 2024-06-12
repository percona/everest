package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CreateNamespace creates the given namespace.
func (k *Kubernetes) CreateNamespace(ctx context.Context, namespace *corev1.Namespace) error {
	if _, err := k.client.CreateNamespace(ctx, namespace); err != nil {
		return err
	}
	return nil
}

// GetNamespace returns a namespace.
func (k *Kubernetes) GetNamespace(ctx context.Context, name string) (*corev1.Namespace, error) {
	return k.client.GetNamespace(ctx, name)
}

// DeleteNamespace deletes a namespace.
func (k *Kubernetes) DeleteNamespace(ctx context.Context, name string) error {
	return k.client.DeleteNamespace(ctx, name)
}

// ListNamespaces lists all namespaces.
func (k *Kubernetes) ListNamespaces(ctx context.Context, opts metav1.ListOptions) (*corev1.NamespaceList, error) {
	return k.client.ListNamespaces(ctx, opts)
}

// UpdateNamespace updates the given namespace.
func (k *Kubernetes) UpdateNamespace(ctx context.Context, namespace *corev1.Namespace, opts metav1.UpdateOptions) (*corev1.Namespace, error) {
	return k.client.UpdateNamespace(ctx, namespace, opts)
}
