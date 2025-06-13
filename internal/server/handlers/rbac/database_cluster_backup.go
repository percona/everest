package rbac

import (
	"context"
	"errors"
	"fmt"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
	"github.com/percona/everest/pkg/rbac"
)

func (h *rbacHandler) ListDatabaseClusterBackups(ctx context.Context, cluster, namespace, clusterName string) (*everestv1alpha1.DatabaseClusterBackupList, error) {
	list, err := h.next.ListDatabaseClusterBackups(ctx, cluster, namespace, clusterName)
	if err != nil {
		return nil, err
	}
	filtered := []everestv1alpha1.DatabaseClusterBackup{}
	for _, dbbackup := range list.Items {
		if err := h.enforceDBBackupRead(ctx, &dbbackup); errors.Is(err, ErrInsufficientPermissions) {
			continue
		} else if err != nil {
			return nil, err
		}
		filtered = append(filtered, dbbackup)
	}
	list.Items = filtered
	return list, nil
}

func (h *rbacHandler) CreateDatabaseClusterBackup(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseClusterBackup) (*everestv1alpha1.DatabaseClusterBackup, error) {
	clusterName := req.Spec.DBClusterName
	bsName := req.Spec.BackupStorageName
	namespace := req.GetNamespace()
	if err := h.enforce(ctx, rbac.ResourceBackupStorages, rbac.ActionRead, rbac.ObjectName(namespace, bsName)); err != nil {
		return nil, err
	}
	if err := h.enforce(ctx, rbac.ResourceDatabaseClusterBackups, rbac.ActionCreate, rbac.ObjectName(namespace, clusterName)); err != nil {
		return nil, err
	}
	return h.next.CreateDatabaseClusterBackup(ctx, cluster, req)
}

func (h *rbacHandler) DeleteDatabaseClusterBackup(ctx context.Context, cluster, namespace, name string, req *api.DeleteDatabaseClusterBackupParams) error {
	backup, err := h.next.GetDatabaseClusterBackup(ctx, cluster, namespace, name)
	if err != nil {
		return fmt.Errorf("GetDatabaseClusterBackup failed: %w", err)
	}
	clusterName := backup.Spec.DBClusterName
	if err := h.enforce(ctx, rbac.ResourceDatabaseClusterBackups, rbac.ActionDelete, rbac.ObjectName(namespace, clusterName)); err != nil {
		return err
	}
	return h.next.DeleteDatabaseClusterBackup(ctx, cluster, namespace, name, req)
}

func (h *rbacHandler) GetDatabaseClusterBackup(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.DatabaseClusterBackup, error) {
	dbbackup, err := h.next.GetDatabaseClusterBackup(ctx, cluster, namespace, name)
	if err != nil {
		return nil, err
	}
	if err := h.enforceDBBackupRead(ctx, dbbackup); err != nil {
		return nil, err
	}
	return h.next.GetDatabaseClusterBackup(ctx, cluster, namespace, name)
}

func (h *rbacHandler) enforceDBBackupRead(ctx context.Context, dbbackup *everestv1alpha1.DatabaseClusterBackup) error {
	clusterName := dbbackup.Spec.DBClusterName
	bsName := dbbackup.Spec.BackupStorageName
	namespace := dbbackup.GetNamespace()
	if err := h.enforce(ctx, rbac.ResourceBackupStorages, rbac.ActionRead, rbac.ObjectName(namespace, bsName)); err != nil {
		return err
	}
	if err := h.enforce(ctx, rbac.ResourceDatabaseClusterBackups, rbac.ActionRead, rbac.ObjectName(namespace, clusterName)); err != nil {
		return err
	}
	return nil
}
