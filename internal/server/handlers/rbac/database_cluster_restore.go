package rbac

import (
	"context"

	"github.com/percona/everest/api"
)

func (h *rbacHandler) ListDatabaseClusterRestores(ctx context.Context, user, namespace string) (*api.DatabaseClusterRestoreList, error) {
	return nil, nil
}

func (h *rbacHandler) CreateDatabaseClusterRestore(ctx context.Context, user, req *api.DatabaseClusterRestore) error {
	return nil
}

func (h *rbacHandler) DeleteDatabaseClusterRestore(ctx context.Context, user, namespace, name string) error {
	return nil
}

func (h *rbacHandler) GetDatabaseClusterRestore(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterRestore, error) {
	return nil, nil
}

func (h *rbacHandler) UpdateDatabaseClusterRestore(ctx context.Context, user string, req *api.DatabaseClusterRestore) error {
	return nil
}
