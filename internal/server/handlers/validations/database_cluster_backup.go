package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

func (h *validateHandler) ListDatabaseClusterBackups(ctx context.Context, user, namespace, clusterName string) (*everestv1alpha1.DatabaseClusterBackupList, error) {
	return h.next.ListDatabaseClusterBackups(ctx, user, namespace, clusterName)
}

func (h *validateHandler) CreateDatabaseClusterBackup(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterBackup) (*everestv1alpha1.DatabaseClusterBackup, error) {
	return h.next.CreateDatabaseClusterBackup(ctx, user, req)
}

func (h *validateHandler) DeleteDatabaseClusterBackup(ctx context.Context, user, namespace, name string, req *api.DeleteDatabaseClusterBackupParams) error {
	return h.next.DeleteDatabaseClusterBackup(ctx, user, namespace, name, req)
}

func (h *validateHandler) GetDatabaseClusterBackup(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseClusterBackup, error) {
	return h.next.GetDatabaseClusterBackup(ctx, user, namespace, name)
}
