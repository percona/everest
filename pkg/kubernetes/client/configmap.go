package client

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetConfigMap returns config map by name.
func (c *Client) GetConfigMap(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error) {
	return c.clientset.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
}
