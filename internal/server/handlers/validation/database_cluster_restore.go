package validation

import (
	"context"
	"errors"
	"fmt"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

func (h *validateHandler) ListDatabaseClusterRestores(ctx context.Context, cluster, namespace, clusterName string) (*everestv1alpha1.DatabaseClusterRestoreList, error) {
	return h.next.ListDatabaseClusterRestores(ctx, cluster, namespace, clusterName)
}

func (h *validateHandler) CreateDatabaseClusterRestore(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	if err := h.validateDatabaseClusterRestore(ctx, cluster, req); err != nil {
		return nil, errors.Join(ErrInvalidRequest, err)
	}
	return h.next.CreateDatabaseClusterRestore(ctx, cluster, req)
}

func (h *validateHandler) DeleteDatabaseClusterRestore(ctx context.Context, cluster, namespace, name string) error {
	return h.next.DeleteDatabaseClusterRestore(ctx, cluster, namespace, name)
}

func (h *validateHandler) GetDatabaseClusterRestore(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return h.next.GetDatabaseClusterRestore(ctx, cluster, namespace, name)
}

func (h *validateHandler) UpdateDatabaseClusterRestore(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	if err := h.validateDatabaseClusterRestore(ctx, cluster, req); err != nil {
		return nil, errors.Join(ErrInvalidRequest, err)
	}
	return h.next.UpdateDatabaseClusterRestore(ctx, cluster, req)
}

func (h *validateHandler) validateDatabaseClusterRestore(
	ctx context.Context,
	cluster string,
	restore *everestv1alpha1.DatabaseClusterRestore,
) error {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return errors.Join(err, errors.New("could not get kube connector"))
	}

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

	db, err := connector.GetDatabaseCluster(ctx, types.NamespacedName{Namespace: namespace, Name: restore.Spec.DBClusterName})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return fmt.Errorf("database cluster %s does not exist", restore.Spec.DBClusterName)
		}
		return err
	}

	// See: https://github.com/percona/everest-operator/pull/739
	if db.Spec.Engine.Type == everestv1alpha1.DatabaseEnginePXC && db.Spec.Paused {
		return errors.New("cannot restore when database cluster is paused")
	}

	b, err := connector.GetDatabaseClusterBackup(ctx, types.NamespacedName{Namespace: namespace, Name: restore.Spec.DataSource.DBClusterBackupName})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return fmt.Errorf("backup %s does not exist", restore.Spec.DataSource.DBClusterBackupName)
		}
		return err
	}
	_, err = connector.GetBackupStorage(ctx, types.NamespacedName{Namespace: namespace, Name: b.Spec.BackupStorageName})
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
