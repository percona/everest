package rbac

import (
	"context"

	"github.com/percona/everest/api"
)

func (h *rbacHandler) ListBackupStorages(ctx context.Context, user, namespace string) ([]*api.BackupStorage, error) {
	return nil, nil
}

func (h *rbacHandler) GetBackupStorage(ctx context.Context, user, namespace, name string) (*api.BackupStorage, error) {
	return nil, nil
}

func (h *rbacHandler) CreateBackupStorage(ctx context.Context, user string, req *api.BackupStorage) error {
	return nil
}

func (h *rbacHandler) UpdateBackupStorage(ctx context.Context, user string, req *api.BackupStorage) error {
	return nil
}

func (h *rbacHandler) DeleteBackupStorage(ctx context.Context, user, namespace, name string) error {
	return nil
}
