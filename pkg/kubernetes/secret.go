package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
)

// GetSecret returns a secret by name.
func (k *Kubernetes) GetSecret(ctx context.Context, namespace, name string) (*corev1.Secret, error) {
	return k.client.GetSecret(ctx, namespace, name)
}

// CreateSecret creates a secret.
func (k *Kubernetes) CreateSecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error) {
	return k.client.CreateSecret(ctx, secret)
}

// UpdateSecret updates a secret.
func (k *Kubernetes) UpdateSecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error) {
	return k.client.UpdateSecret(ctx, secret)
}

// DeleteSecret deletes a secret.
func (k *Kubernetes) DeleteSecret(ctx context.Context, namespace, name string) error {
	return k.client.DeleteSecret(ctx, namespace, name)
}
