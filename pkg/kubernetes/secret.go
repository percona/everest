package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
)

// ListSecrets returns secret by name.
// This method returns a list of full objects (meta and spec).
func (k *Kubernetes) ListSecrets(ctx context.Context, opts ...ctrlclient.ListOption) (*corev1.SecretList, error) {
	result := &corev1.SecretList{}
	if err := k.k8sClient.List(ctx, result, opts...); err != nil {
		return nil, err
	}
	return result, nil
}

// GetSecret returns a secret by name.
func (k *Kubernetes) GetSecret(ctx context.Context, key ctrlclient.ObjectKey) (*corev1.Secret, error) {
	result := &corev1.Secret{}
	if err := k.k8sClient.Get(ctx, key, result); err != nil {
		return nil, err
	}
	return result, nil
}

// CreateSecret creates a secret.
func (k *Kubernetes) CreateSecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error) {
	if err := k.k8sClient.Create(ctx, secret); err != nil {
		return nil, err
	}
	return secret, nil
}

// SetSecret creates or updates an existing secret.
// func (k *Kubernetes) SetSecret(secret *corev1.Secret) error {
// 	return k.ApplyObject(secret)
// }

// UpdateSecret updates a secret.
func (k *Kubernetes) UpdateSecret(ctx context.Context, secret *corev1.Secret) (*corev1.Secret, error) {
	if err := k.k8sClient.Update(ctx, secret); err != nil {
		return nil, err
	}
	return secret, nil
}

// DeleteSecret deletes a secret.
func (k *Kubernetes) DeleteSecret(ctx context.Context, obj *corev1.Secret) error {
	return k.k8sClient.Delete(ctx, obj)
}
