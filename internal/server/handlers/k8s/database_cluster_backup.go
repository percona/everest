package k8s

import (
	"context"
	"errors"
	"slices"

	"github.com/AlekSi/pointer"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

const (
	databaseClusterNameLabel = "clusterName"
)

func (h *k8sHandler) ListDatabaseClusterBackups(ctx context.Context, user, namespace, clusterName string) (*everestv1alpha1.DatabaseClusterBackupList, error) {
	return h.kubeClient.ListDatabaseClusterBackups(ctx, namespace, metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{
			MatchLabels: map[string]string{
				"clusterName": clusterName,
			},
		}),
	})
}

func (h *k8sHandler) CreateDatabaseClusterBackup(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterBackup) (*everestv1alpha1.DatabaseClusterBackup, error) {
	if ok, err := h.ensureNoBackupsRunningForCluster(ctx, req.Spec.DBClusterName, req.GetNamespace()); err != nil {
		return nil, errors.Join(err, errors.New("could not check if backups are running"))
	} else if !ok {
		return nil, errors.New("backup is already running for the specified cluster")
	}
	return h.kubeClient.CreateDatabaseClusterBackup(ctx, req)
}

func (h *k8sHandler) DeleteDatabaseClusterBackup(ctx context.Context, user, namespace, name string, req *api.DeleteDatabaseClusterBackupParams) error {
	cleanupStorage := pointer.Get(req.CleanupBackupStorage)
	backup, err := h.kubeClient.GetDatabaseClusterBackup(ctx, namespace, name)
	if err != nil {
		return errors.Join(err, errors.New("could not get Database Cluster Backup"))
	}

	if !cleanupStorage {
		if err := h.ensureBackupStorageProtection(ctx, backup); err != nil {
			return errors.Join(err, errors.New("could not ensure backup storage protection"))
		}
	}
	if err := h.ensureBackupForegroundDeletion(ctx, backup); err != nil {
		return errors.Join(err, errors.New("could not ensure backup foreground deletion"))
	}
	return h.kubeClient.DeleteDatabaseClusterBackup(ctx, namespace, name)
}

func (h *k8sHandler) GetDatabaseClusterBackup(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseClusterBackup, error) {
	return h.kubeClient.GetDatabaseClusterBackup(ctx, namespace, name)
}

// Returns `true` if no backups are running for the specified cluster.
func (h *k8sHandler) ensureNoBackupsRunningForCluster(ctx context.Context, dbClusterName, namespace string) (bool, error) {
	backupList, err := h.kubeClient.ListDatabaseClusterBackups(ctx, namespace, metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{
			MatchLabels: map[string]string{
				databaseClusterNameLabel: dbClusterName,
			},
		}),
	})
	if err != nil {
		return false, errors.Join(err, errors.New("could not list Database Cluster Backups"))
	}
	return !slices.ContainsFunc(backupList.Items, func(b everestv1alpha1.DatabaseClusterBackup) bool {
		return (b.Status.State == everestv1alpha1.BackupRunning ||
			b.Status.State == everestv1alpha1.BackupStarting ||
			b.Status.State == everestv1alpha1.BackupNew) &&
			b.DeletionTimestamp.IsZero()
	}), nil
}
