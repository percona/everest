package client

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// CreateNamespace creates the given namespace.
func (c *Client) CreateNamespace(ctx context.Context, namespace *corev1.Namespace) (*corev1.Namespace, error) {
	return c.clientset.CoreV1().Namespaces().Create(ctx, namespace, metav1.CreateOptions{})
}

// GetNamespace returns a namespace.
func (c *Client) GetNamespace(ctx context.Context, name string) (*corev1.Namespace, error) {
	return c.clientset.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{})
}

// DeleteNamespace deletes a namespace.
func (c *Client) DeleteNamespace(ctx context.Context, name string) error {
	return c.clientset.CoreV1().Namespaces().Delete(ctx, name, metav1.DeleteOptions{})
}

// ListNamespaces returns a list of namespaces.
func (c *Client) ListNamespaces(ctx context.Context, opts metav1.ListOptions) (*corev1.NamespaceList, error) {
	return c.clientset.CoreV1().Namespaces().List(ctx, opts)
}

// UpdateNamespace updates the given namespace.
func (c *Client) UpdateNamespace(ctx context.Context, namespace *corev1.Namespace, opts metav1.UpdateOptions) (*corev1.Namespace, error) {
	return c.clientset.CoreV1().Namespaces().Update(ctx, namespace, opts)
}
