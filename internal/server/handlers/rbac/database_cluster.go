package rbac

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/AlekSi/pointer"
	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
	"github.com/percona/everest/pkg/rbac"
)

func (h *rbacHandler) CreateDatabaseCluster(ctx context.Context, user, namespace string, req *api.DatabaseCluster) error {
	object := rbac.ObjectName(namespace, "") // todo: name
	if err := h.enforce(user, rbac.ResourceDatabaseClusters, rbac.ActionCreate, object); err != nil {
		return err
	}
	schedules := pointer.Get(pointer.Get(pointer.Get(req.Spec).Backup).Schedules)
	if len(schedules) > 0 {
		// To be able to create a cluster with backup schedules, the user needs to explicitly
		// have permissions to take backups.
		if err := h.enforce(user, rbac.ResourceDatabaseClusterBackups, rbac.ActionCreate, rbac.ObjectName(namespace, "")); err != nil {
			return err
		}
		// User should be able to read a backup storage to use it in a backup schedule.
		for _, sched := range schedules {
			if err := h.enforce(user, rbac.ResourceBackupStorages, rbac.ActionRead,
				rbac.ObjectName(namespace, sched.BackupStorageName),
			); err != nil {
				return err
			}
		}
	}

	// Check permissions for creating a cluster from a backup.
	sourceBackup := pointer.Get(pointer.Get(pointer.Get(req.Spec).DataSource).DbClusterBackupName)
	if sourceBackup != "" {
		if err := h.enforce(user, rbac.ResourceDatabaseClusterRestores, rbac.ActionCreate, rbac.ObjectName(namespace, "")); err != nil {
			return err
		}
		// Get the name of the source database cluster.
		bkp, err := h.kubeClient.GetDatabaseClusterBackup(ctx, namespace, sourceBackup)
		if err != nil {
			return errors.Join(err, errors.New("failed to get database cluster backup"))
		}
		sourceDB := bkp.Spec.DBClusterName

		if err := h.enforceDBRestore(user, namespace, sourceDB); err != nil {
			return err
		}
	}
	return h.next.CreateDatabaseCluster(ctx, user, namespace, req)
}

func (h *rbacHandler) ListDatabaseClusters(ctx context.Context, user, namespace string) (*api.DatabaseClusterList, error) {
	clusterList, err := h.next.ListDatabaseClusters(ctx, user, namespace)
	if err != nil {
		return nil, fmt.Errorf("ListDatabaseClusters failed: %w", err)
	}

	result := []api.DatabaseCluster{}
	for _, cluster := range *clusterList.Items {
		name := "" // todo
		if err := h.enforce(user, rbac.ResourceDatabaseClusters, rbac.ActionRead, rbac.ObjectName(namespace, name)); errors.Is(err, ErrInsufficientPermissions) {
			continue
		} else if err != nil {
			return nil, fmt.Errorf("enforce failed: %w", err)
		}
		result = append(result, cluster)
	}
	clusterList.Items = &result
	return clusterList, nil
}

func (h *rbacHandler) DeleteDatabaseCluster(ctx context.Context, user, namespace, name string, req *api.DeleteDatabaseClusterParams) error {
	if err := h.enforce(user, rbac.ResourceDatabaseClusters, rbac.ActionDelete, rbac.ObjectName(namespace, name)); err != nil {
		return err
	}
	engineName := "" // todo
	if err := h.enforce(user, rbac.ResourceDatabaseEngines, rbac.ActionRead, rbac.ObjectName(namespace, engineName)); err != nil {
		return err
	}
	return h.next.DeleteDatabaseCluster(ctx, user, namespace, name, req)
}

func (h *rbacHandler) UpdateDatabaseCluster(ctx context.Context, user, namespace, name string, req *api.DatabaseCluster) error {
	if err := h.enforce(user, rbac.ResourceDatabaseClusters, rbac.ActionUpdate, rbac.ObjectName(namespace, name)); err != nil {
		return err
	}
	engineName := "" // todo
	if err := h.enforce(user, rbac.ResourceDatabaseEngines, rbac.ActionRead, rbac.ObjectName(namespace, engineName)); err != nil {
		return err
	}

	oldDB, err := h.kubeClient.GetDatabaseCluster(ctx, namespace, name)
	if err != nil {
		return err
	}
	updatedDB := &everestv1alpha1.DatabaseCluster{} //todo
	updatedSched := updatedDB.Spec.Backup.Schedules
	oldSched := oldDB.Spec.Backup.Schedules

	sortFn := func(a, b everestv1alpha1.BackupSchedule) int { return strings.Compare(a.Name, b.Name) }
	slices.SortFunc(oldSched, sortFn)
	slices.SortFunc(updatedSched, sortFn)

	isSchedEqual := func() bool {
		if len(oldSched) != len(updatedSched) {
			return false
		}
		for i := range oldSched {
			if oldSched[i].Name != updatedSched[i].Name ||
				oldSched[i].Enabled != updatedSched[i].Enabled ||
				oldSched[i].BackupStorageName != updatedSched[i].BackupStorageName ||
				oldSched[i].Schedule != updatedSched[i].Schedule ||
				oldSched[i].RetentionCopies != updatedSched[i].RetentionCopies {
				return false
			}
		}
		return true
	}

	// If shedules are updated, user should have permissions to create a backup.
	if !isSchedEqual() {
		if err := h.enforce(user, rbac.ResourceDatabaseClusterBackups, rbac.ActionCreate, rbac.ObjectName(oldDB.GetNamespace(), "")); err != nil {
			return err
		}
	}

	// User should be able to read a backup storage to use it in a backup schedule.
	for _, sched := range updatedSched {
		if err := h.enforce(user, rbac.ResourceBackupStorages, rbac.ActionRead,
			rbac.ObjectName(oldDB.GetNamespace(), sched.BackupStorageName),
		); err != nil {
			return err
		}
	}

	return nil
}

func (h *rbacHandler) GetDatabaseCluster(ctx context.Context, user, namespace, name string) (*api.DatabaseCluster, error) {
	if err := h.enforce(user, rbac.ResourceDatabaseClusters, rbac.ActionRead, rbac.ObjectName(namespace, name)); err != nil {
		return nil, err
	}

	result, err := h.next.GetDatabaseCluster(ctx, user, namespace, name)
	if err != nil {
		return nil, err
	}

	db := &everestv1alpha1.DatabaseCluster{} //todo
	// Check if the user has permissions for all backup-storages in the schedule?
	for _, sched := range db.Spec.Backup.Schedules {
		bsName := sched.BackupStorageName
		if err := h.enforce(user, rbac.ResourceBackupStorages, rbac.ActionRead, rbac.ObjectName(db.GetNamespace(), bsName)); err != nil {
			return nil, err
		}
	}
	// Check if the user has permission for the backup-storages used by PITR (if any)?
	if bsName := pointer.Get(db.Spec.Backup.PITR.BackupStorageName); bsName != "" {
		if err := h.enforce(user, rbac.ResourceBackupStorages, rbac.ActionRead, rbac.ObjectName(db.GetNamespace(), bsName)); err != nil {
			return nil, err
		}
	}
	// Check if the user has permissions for MonitoringConfig?
	if mcName := pointer.Get(db.Spec.Monitoring).MonitoringConfigName; mcName != "" {
		if err := h.enforce(user, rbac.ResourceMonitoringInstances, rbac.ActionRead, rbac.ObjectName(db.GetNamespace(), mcName)); err != nil {
			return nil, err
		}
	}

	engineName := "" // todo
	if err := h.enforce(user, rbac.ResourceDatabaseEngines, rbac.ActionRead, rbac.ObjectName(namespace, engineName)); err != nil {
		return nil, err
	}
	return result, nil
}

func (h *rbacHandler) GetDatabaseClusterCredentials(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterCredential, error) {
	if err := h.enforce(user, rbac.ResourceDatabaseClusters, rbac.ActionRead, rbac.ObjectName(namespace, name)); err != nil {
		return nil, err
	}
	if err := h.enforce(user, rbac.ResourceDatabaseClusterCredentials, rbac.ActionRead, rbac.ObjectName(namespace, name)); err != nil {
		return nil, err
	}
	return h.next.GetDatabaseClusterCredentials(ctx, user, namespace, name)
}

func (h *rbacHandler) GetDatabaseClusterComponents(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterComponents, error) {
	if err := h.enforce(user, rbac.ResourceDatabaseClusters, rbac.ActionRead, rbac.ObjectName(namespace, name)); err != nil {
		return nil, err
	}
	return h.next.GetDatabaseClusterComponents(ctx, user, namespace, name)
}

func (h *rbacHandler) GetDatabaseClusterPitr(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterPitr, error) {
	if err := h.enforce(user, rbac.ResourceDatabaseClusters, rbac.ActionRead, rbac.ObjectName(namespace, name)); err != nil {
		return nil, err
	}
	return h.next.GetDatabaseClusterPitr(ctx, user, namespace, name)
}
