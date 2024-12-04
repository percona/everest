package rbac

import (
	"context"
	"errors"
	"fmt"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/rbac"
)

func (h *rbacHandler) ListDatabaseClusterBackups(ctx context.Context, user, namespace string) (*everestv1alpha1.DatabaseClusterBackupList, error) {
	list, err := h.next.ListDatabaseClusterBackups(ctx, user, namespace)
	if err != nil {
		return nil, err
	}
	filtered := []everestv1alpha1.DatabaseClusterBackup{}
	for _, dbbackup := range list.Items {
		if err := h.enforceDBBackupRead(user, &dbbackup); errors.Is(err, ErrInsufficientPermissions) {
			continue
		} else if err != nil {
			return nil, err
		}
		filtered = append(filtered, dbbackup)
	}
	list.Items = filtered
	return list, nil
}

func (h *rbacHandler) CreateDatabaseClusterBackup(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterBackup) error {
	if err := h.enforceDBBackupRead(user, req); err != nil {
		return err
	}
	return h.next.CreateDatabaseClusterBackup(ctx, user, req)
}

func (h *rbacHandler) DeleteDatabaseClusterBackup(ctx context.Context, user, namespace, name string) error {
	backup, err := h.kubeClient.GetDatabaseClusterBackup(ctx, namespace, name)
	if err != nil {
		return fmt.Errorf("GetDatabaseClusterBackup failed: %w", err)
	}
	clusterName := backup.Spec.DBClusterName
	if err := h.enforce(user, rbac.ResourceDatabaseClusterBackups, rbac.ActionRead, rbac.ObjectName(namespace, clusterName)); err != nil {
		return nil
	}
	return h.next.DeleteDatabaseClusterBackup(ctx, user, namespace, name)
}

func (h *rbacHandler) GetDatabaseClusterBackup(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseClusterBackup, error) {
	dbbackup, err := h.next.GetDatabaseClusterBackup(ctx, user, namespace, name)
	if err != nil {
		return nil, err
	}
	if err := h.enforceDBBackupRead(user, dbbackup); err != nil {
		return nil, err
	}
	return h.next.GetDatabaseClusterBackup(ctx, user, namespace, name)
}

func (h *rbacHandler) enforceDBBackupRead(user string, dbbackup *everestv1alpha1.DatabaseClusterBackup) error {
	clusterName := dbbackup.Spec.DBClusterName
	bsName := dbbackup.Spec.BackupStorageName
	namespace := dbbackup.GetNamespace()
	if err := h.enforce(user, rbac.ResourceBackupStorages, rbac.ActionRead, rbac.ObjectName(namespace, bsName)); err != nil {
		return err
	}
	if err := h.enforce(user, rbac.ResourceDatabaseClusterBackups, rbac.ActionRead, rbac.ObjectName(namespace, clusterName)); err != nil {
		return nil
	}
	return nil
}
