package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetPods returns list of pods.
func (k *Kubernetes) GetPods(ctx context.Context, namespace string, labelSelector *metav1.LabelSelector) (*corev1.PodList, error) {
	return k.client.GetPods(ctx, namespace, labelSelector)
}
