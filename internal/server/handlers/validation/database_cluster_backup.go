package validation

import (
	"context"
	"errors"
	"fmt"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

func (h *validateHandler) ListDatabaseClusterBackups(ctx context.Context, cluster, namespace, clusterName string) (*everestv1alpha1.DatabaseClusterBackupList, error) {
	return h.next.ListDatabaseClusterBackups(ctx, cluster, namespace, clusterName)
}

func (h *validateHandler) CreateDatabaseClusterBackup(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseClusterBackup) (*everestv1alpha1.DatabaseClusterBackup, error) {
	if err := h.validateDatabaseClusterBackup(ctx, cluster, req); err != nil {
		return nil, errors.Join(ErrInvalidRequest, err)
	}
	return h.next.CreateDatabaseClusterBackup(ctx, cluster, req)
}

func (h *validateHandler) DeleteDatabaseClusterBackup(ctx context.Context, cluster, namespace, name string, req *api.DeleteDatabaseClusterBackupParams) error {
	return h.next.DeleteDatabaseClusterBackup(ctx, cluster, namespace, name, req)
}

func (h *validateHandler) GetDatabaseClusterBackup(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.DatabaseClusterBackup, error) {
	return h.next.GetDatabaseClusterBackup(ctx, cluster, namespace, name)
}

func (h *validateHandler) validateDatabaseClusterBackup(ctx context.Context, cluster string, backup *everestv1alpha1.DatabaseClusterBackup) error {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return errors.Join(err, errors.New("could not get kube connector"))
	}

	if backup == nil {
		return errors.New("backup cannot be empty")
	}
	if backup.Spec.BackupStorageName == "" {
		return errors.New(".spec.backupStorageName cannot be empty")
	}
	if backup.Spec.DBClusterName == "" {
		return errors.New(".spec.dbClusterName cannot be empty")
	}
	namespace := backup.GetNamespace()
	db, err := connector.GetDatabaseCluster(ctx, types.NamespacedName{Namespace: namespace, Name: backup.Spec.DBClusterName})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return fmt.Errorf("database cluster %s does not exist", backup.Spec.DBClusterName)
		}
		return err
	}

	if err = h.validatePGReposForBackup(ctx, cluster, db, backup); err != nil {
		return err
	}

	if db.Spec.Engine.Type == everestv1alpha1.DatabaseEnginePSMDB {
		if db.Status.ActiveStorage != "" && db.Status.ActiveStorage != backup.Spec.BackupStorageName {
			return errPSMDBViolateActiveStorage
		}
	}
	return nil
}

func (h *validateHandler) validatePGReposForBackup(
	ctx context.Context,
	cluster string,
	db *everestv1alpha1.DatabaseCluster,
	newBackup *everestv1alpha1.DatabaseClusterBackup,
) error {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return errors.Join(err, errors.New("could not get kube connector"))
	}

	if db.Spec.Engine.Type != everestv1alpha1.DatabaseEnginePostgresql {
		return nil
	}

	// put the backup that being validated to the list of all backups to calculate if the limitations are respected
	getBackupsFunc := func(ctx context.Context, opts ...ctrlclient.ListOption) (*everestv1alpha1.DatabaseClusterBackupList, error) {
		list, err := connector.ListDatabaseClusterBackups(ctx, opts...)
		if err != nil {
			return nil, err
		}
		list.Items = append(list.Items, *newBackup)
		return list, nil
	}

	if err := validatePGReposForAPIDB(ctx, db, getBackupsFunc); err != nil {
		return err
	}
	return nil
}
