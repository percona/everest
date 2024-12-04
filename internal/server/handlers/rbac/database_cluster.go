package rbac

import (
	"context"

	"github.com/percona/everest/api"
)

func (h *rbacHandler) CreateDatabaseCluster(ctx context.Context, user string, req *api.DatabaseCluster) error {
	return nil
}

func (h *rbacHandler) ListDatabaseClusters(ctx context.Context, user, namespace string) (*api.DatabaseClusterList, error) {
	return nil, nil
}

func (h *rbacHandler) DeleteDatabaseCluster(ctx context.Context, user, namespace, name string, req *api.DeleteDatabaseClusterParams) error {
	return nil
}

func (h *rbacHandler) UpdateDatabaseCluster(ctx context.Context, user string, req *api.DatabaseCluster) error {
	return nil
}

func (h *rbacHandler) GetDatabaseCluster(ctx context.Context, user, namespace, name string) (*api.DatabaseCluster, error) {
	return nil, nil
}

func (h *rbacHandler) GetDatabaseClusterCredentials(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterCredential, error) {
	return nil, nil
}

func (h *rbacHandler) GetDatabaseClusterComponents(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterComponents, error) {
	return nil, nil
}

func (h *rbacHandler) GetDatabaseClusterPitr(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterPitr, error) {
	return nil, nil
}
