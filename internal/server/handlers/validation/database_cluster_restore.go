package validation

import (
	"context"
	"errors"
	"fmt"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

func (h *validateHandler) ListDatabaseClusterRestores(ctx context.Context, user, namespace, clusterName string) (*everestv1alpha1.DatabaseClusterRestoreList, error) {
	return h.next.ListDatabaseClusterRestores(ctx, user, namespace, clusterName)
}

func (h *validateHandler) CreateDatabaseClusterRestore(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	if err := h.validateDatabaseClusterRestore(ctx, req); err != nil {
		return nil, errors.Join(ErrInvalidRequest, err)
	}
	return h.next.CreateDatabaseClusterRestore(ctx, user, req)
}

func (h *validateHandler) DeleteDatabaseClusterRestore(ctx context.Context, user, namespace, name string) error {
	return h.next.DeleteDatabaseClusterRestore(ctx, user, namespace, name)
}

func (h *validateHandler) GetDatabaseClusterRestore(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return h.next.GetDatabaseClusterRestore(ctx, user, namespace, name)
}

func (h *validateHandler) UpdateDatabaseClusterRestore(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	if err := h.validateDatabaseClusterRestore(ctx, req); err != nil {
		return nil, errors.Join(ErrInvalidRequest, err)
	}
	return h.next.UpdateDatabaseClusterRestore(ctx, user, req)
}

func (h *validateHandler) validateDatabaseClusterRestore(
	ctx context.Context,
	restore *everestv1alpha1.DatabaseClusterRestore,
) error {
	if restore == nil {
		return errors.New("restore cannot be empty")
	}
	if err := validateMetadata(restore); err != nil {
		return err
	}
	if restore.Spec.DataSource.DBClusterBackupName == "" {
		return errors.New(".spec.dataSource.dbClusterBackupName cannot be empty")
	}
	if restore.Spec.DBClusterName == "" {
		return errors.New(".spec.dbClusterName cannot be empty")
	}
	namespace := restore.GetNamespace()
	_, err := h.kubeClient.GetDatabaseCluster(ctx, namespace, restore.Spec.DBClusterName)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return fmt.Errorf("database cluster %s does not exist", restore.Spec.DBClusterName)
		}
		return err
	}
	b, err := h.kubeClient.GetDatabaseClusterBackup(ctx, namespace, restore.Spec.DataSource.DBClusterBackupName)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return fmt.Errorf("backup %s does not exist", restore.Spec.DataSource.DBClusterBackupName)
		}
		return err
	}
	_, err = h.kubeClient.GetBackupStorage(ctx, namespace, b.Spec.BackupStorageName)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return fmt.Errorf("backup storage %s does not exist",
				b.Spec.BackupStorageName,
			)
		}
		return err
	}
	if err := validateDataSource(&restore.Spec.DataSource); err != nil {
		return err
	}
	return err
}
