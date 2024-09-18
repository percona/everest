package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
)

// GetConfigMap returns k8s configmap by provided name and namespace.
func (k *Kubernetes) GetConfigMap(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error) {
	return k.client.GetConfigMap(ctx, namespace, name)
}

// UpdateConfigMap updated the provided config.
func (k *Kubernetes) UpdateConfigMap(ctx context.Context, cm *corev1.ConfigMap) (*corev1.ConfigMap, error) {
	return k.client.UpdateConfigMap(ctx, cm)
}
