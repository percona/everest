package client

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ListDatabaseEngines returns list of managed database clusters.
func (c *Client) ListDatabaseEngines(ctx context.Context, namespace string) (*everestv1alpha1.DatabaseEngineList, error) {
	return c.customClientSet.DBEngines(namespace).List(ctx, metav1.ListOptions{})
}

// GetDatabaseEngine returns database clusters by provided name.
func (c *Client) GetDatabaseEngine(ctx context.Context, namespace, name string) (*everestv1alpha1.DatabaseEngine, error) {
	return c.customClientSet.DBEngines(namespace).Get(ctx, name, metav1.GetOptions{})
}
