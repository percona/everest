package kubernetes

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
)

// ListPods returns list of pods that match the criteria.
// This method returns a list of full objects (meta and spec).
func (k *Kubernetes) ListPods(ctx context.Context, opts ...ctrlclient.ListOption) (*corev1.PodList, error) {
	result := &corev1.PodList{}
	if err := k.k8sClient.List(ctx, result, opts...); err != nil {
		return nil, err
	}
	return result, nil
}
