package client

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ListDatabaseClusterRestores returns list of managed database clusters.
func (c *Client) ListDatabaseClusterRestores(ctx context.Context, namespace string, options metav1.ListOptions) (*everestv1alpha1.DatabaseClusterRestoreList, error) {
	return c.customClientSet.DBClusterRestores(namespace).List(ctx, options)
}

// GetDatabaseClusterRestore returns database clusters by provided name.
func (c *Client) GetDatabaseClusterRestore(ctx context.Context, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return c.customClientSet.DBClusterRestores(namespace).Get(ctx, name, metav1.GetOptions{})
}
