package client

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ListDatabaseClusters returns list of managed database clusters.
func (c *Client) ListDatabaseClusters(ctx context.Context, namespace string, options metav1.ListOptions) (*everestv1alpha1.DatabaseClusterList, error) {
	return c.customClientSet.DBClusters(namespace).List(ctx, options)
}

// GetDatabaseCluster returns database clusters by provided name.
func (c *Client) GetDatabaseCluster(ctx context.Context, namespace, name string) (*everestv1alpha1.DatabaseCluster, error) {
	return c.customClientSet.DBClusters(namespace).Get(ctx, name, metav1.GetOptions{})
}
