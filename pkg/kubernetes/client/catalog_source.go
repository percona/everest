package client

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// DeleteCatalogSource deletes a catalog source.
func (c *Client) DeleteCatalogSource(ctx context.Context, namespace string, name string) error {
	return c.olmClientset.OperatorsV1alpha1().CatalogSources(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}
