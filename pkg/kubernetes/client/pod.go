package client

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetPods returns list of pods.
func (c *Client) GetPods(ctx context.Context, namespace string, labelSelector *metav1.LabelSelector) (*corev1.PodList, error) {
	options := metav1.ListOptions{}
	if labelSelector != nil && (labelSelector.MatchLabels != nil || labelSelector.MatchExpressions != nil) {
		options.LabelSelector = metav1.FormatLabelSelector(labelSelector)
	}

	return c.clientset.CoreV1().Pods(namespace).List(ctx, options)
}

// ListPods lists pods.
func (c *Client) ListPods(ctx context.Context, namespace string, options metav1.ListOptions) (*corev1.PodList, error) {
	return c.clientset.CoreV1().Pods(namespace).List(ctx, options)
}

// DeletePod deletes a pod by given name in the given namespace.
func (c *Client) DeletePod(ctx context.Context, namespace, name string) error {
	return c.clientset.CoreV1().Pods(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}
