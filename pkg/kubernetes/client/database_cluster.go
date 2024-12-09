package client

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

// ListDatabaseClusters returns list of managed database clusters.
func (c *Client) ListDatabaseClusters(ctx context.Context, namespace string, options metav1.ListOptions) (*everestv1alpha1.DatabaseClusterList, error) {
	return c.customClientSet.DBClusters(namespace).List(ctx, options)
}

// GetDatabaseCluster returns database clusters by provided name.
func (c *Client) GetDatabaseCluster(ctx context.Context, namespace, name string) (*everestv1alpha1.DatabaseCluster, error) {
	return c.customClientSet.DBClusters(namespace).Get(ctx, name, metav1.GetOptions{})
}

// CreateDatabaseCluster creates a new database cluster.
func (c *Client) CreateDatabaseCluster(ctx context.Context, namespace string, cluster *everestv1alpha1.DatabaseCluster) (*everestv1alpha1.DatabaseCluster, error) {
	return c.customClientSet.DBClusters(namespace).Create(ctx, cluster, metav1.CreateOptions{})
}

// UpdateDatabaseCluster updates a database cluster.
func (c *Client) UpdateDatabaseCluster(ctx context.Context, namespace string, cluster *everestv1alpha1.DatabaseCluster) (*everestv1alpha1.DatabaseCluster, error) {
	return c.customClientSet.DBClusters(namespace).Update(ctx, cluster, metav1.UpdateOptions{})
}

// DeleteDatabaseCluster deletes a database cluster.
func (c *Client) DeleteDatabaseCluster(ctx context.Context, namespace, name string) error {
	return c.customClientSet.DBClusters(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}
