package client

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

// ListDatabaseClusterBackups returns list of managed database cluster backups.
func (c *Client) ListDatabaseClusterBackups(ctx context.Context, namespace string, options metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
	return c.customClientSet.DBClusterBackups(namespace).List(ctx, options)
}

// GetDatabaseClusterBackup returns database cluster backups by provided name.
func (c *Client) GetDatabaseClusterBackup(ctx context.Context, namespace, name string) (*everestv1alpha1.DatabaseClusterBackup, error) {
	return c.customClientSet.DBClusterBackups(namespace).Get(ctx, name, metav1.GetOptions{})
}

// UpdateDatabaseClusterBackup updates the provided database cluster backup.
func (c *Client) UpdateDatabaseClusterBackup(ctx context.Context, backup *everestv1alpha1.DatabaseClusterBackup) (*everestv1alpha1.DatabaseClusterBackup, error) {
	return c.customClientSet.DBClusterBackups(backup.GetNamespace()).Update(ctx, backup, metav1.UpdateOptions{})
}

// CreateDatabaseClusterBackup creates a new database cluster backup.
func (c *Client) CreateDatabaseClusterBackup(ctx context.Context, namespace string, backup *everestv1alpha1.DatabaseClusterBackup) (*everestv1alpha1.DatabaseClusterBackup, error) {
	return c.customClientSet.DBClusterBackups(namespace).Create(ctx, backup, metav1.CreateOptions{})
}

// DeleteDatabaseClusterBackup deletes a database cluster backup.
func (c *Client) DeleteDatabaseClusterBackup(ctx context.Context, namespace, name string) error {
	return c.customClientSet.DBClusterBackups(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}
