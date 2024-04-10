package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
)

// GetConfigMap returns a config map by name.
func (k *Kubernetes) GetConfigMap(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error) {
	return k.client.GetConfigMap(ctx, namespace, name)
}
