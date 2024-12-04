package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/rbac"
)

func (h *rbacHandler) ListDatabaseClusterRestores(ctx context.Context, user, namespace string) (*everestv1alpha1.DatabaseClusterRestoreList, error) {
	return nil, nil
}

func (h *rbacHandler) CreateDatabaseClusterRestore(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterRestore) error {
	return nil
}

func (h *rbacHandler) DeleteDatabaseClusterRestore(ctx context.Context, user, namespace, name string) error {
	return nil
}

func (h *rbacHandler) GetDatabaseClusterRestore(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return nil, nil
}

func (h *rbacHandler) UpdateDatabaseClusterRestore(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterRestore) error {
	return nil
}

func (h *rbacHandler) enforceDBRestore(user, namespace, clusterName string) error {
	if err := h.enforce(user, rbac.ResourceDatabaseClusterCredentials, rbac.ActionRead, rbac.ObjectName(namespace, clusterName)); err != nil {
		return err
	}
	if err := h.enforce(user, rbac.ResourceDatabaseClusterBackups, rbac.ActionRead, rbac.ObjectName(namespace, clusterName)); err != nil {
		return err
	}
	if err := h.enforce(user, rbac.ResourceDatabaseClusterRestores, rbac.ActionRead, rbac.ObjectName(namespace, clusterName)); err != nil {
		return err
	}
	return nil
}
