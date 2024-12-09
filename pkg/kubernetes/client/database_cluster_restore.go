package client

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

// ListDatabaseClusterRestores returns list of managed database clusters.
func (c *Client) ListDatabaseClusterRestores(ctx context.Context, namespace string, options metav1.ListOptions) (*everestv1alpha1.DatabaseClusterRestoreList, error) {
	return c.customClientSet.DBClusterRestores(namespace).List(ctx, options)
}

// GetDatabaseClusterRestore returns database clusters by provided name.
func (c *Client) GetDatabaseClusterRestore(ctx context.Context, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return c.customClientSet.DBClusterRestores(namespace).Get(ctx, name, metav1.GetOptions{})
}

// CreateDatabaseClusterRestore creates a new database cluster.
func (c *Client) CreateDatabaseClusterRestore(ctx context.Context, namespace string, restore *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return c.customClientSet.DBClusterRestores(namespace).Create(ctx, restore, metav1.CreateOptions{})
}

// UpdateDatabaseClusterRestore updates a database cluster.
func (c *Client) UpdateDatabaseClusterRestore(ctx context.Context, namespace string, restore *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return c.customClientSet.DBClusterRestores(namespace).Update(ctx, restore, metav1.UpdateOptions{})
}

// DeleteDatabaseClusterRestore deletes a database cluster.
func (c *Client) DeleteDatabaseClusterRestore(ctx context.Context, namespace, name string) error {
	return c.customClientSet.DBClusterRestores(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}
