package client

import (
	"context"

	"github.com/operator-framework/api/pkg/operators/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetCSV retrieves an OLM CSV by namespace and name.
func (c *Client) GetCSV(ctx context.Context, namespace string, name string) (*v1alpha1.ClusterServiceVersion, error) {
	c.rcLock.Lock()
	defer c.rcLock.Unlock()

	return c.olmClientset.OperatorsV1alpha1().ClusterServiceVersions(namespace).Get(ctx, name, metav1.GetOptions{})
}
