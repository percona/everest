package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

func (h *validateHandler) ListDatabaseClusterRestores(ctx context.Context, user, namespace, clusterName string) (*everestv1alpha1.DatabaseClusterRestoreList, error) {
	return h.next.ListDatabaseClusterRestores(ctx, user, namespace, clusterName)
}

func (h *validateHandler) CreateDatabaseClusterRestore(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return h.next.CreateDatabaseClusterRestore(ctx, user, req)
}

func (h *validateHandler) DeleteDatabaseClusterRestore(ctx context.Context, user, namespace, name string) error {
	return h.next.DeleteDatabaseClusterRestore(ctx, user, namespace, name)
}

func (h *validateHandler) GetDatabaseClusterRestore(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return h.next.GetDatabaseClusterRestore(ctx, user, namespace, name)
}

func (h *validateHandler) UpdateDatabaseClusterRestore(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return h.next.UpdateDatabaseClusterRestore(ctx, user, req)
}
