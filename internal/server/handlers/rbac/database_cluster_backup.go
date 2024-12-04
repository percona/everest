package rbac

import (
	"context"

	"github.com/percona/everest/api"
)

func (h *rbacHandler) ListDatabaseClusterBackups(ctx context.Context, user, namespace string) (*api.DatabaseClusterBackupList, error) {
	return nil, nil
}

func (h *rbacHandler) CreateDatabaseClusterBackup(ctx context.Context, user, req *api.DatabaseClusterBackup) error {
	return nil
}

func (h *rbacHandler) DeleteDatabaseClusterBackup(ctx context.Context, user, namespace, name string) error {
	return nil
}

func (h *rbacHandler) GetDatabaseClusterBackup(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterBackup, error) {
	return nil, nil
}
