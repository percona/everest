package rbac

import (
	"context"
	"errors"
	"fmt"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/rbac"
)

func (h *rbacHandler) ListDatabaseClusterRestores(ctx context.Context, user, namespace, clusterName string) (*everestv1alpha1.DatabaseClusterRestoreList, error) {
	list, err := h.next.ListDatabaseClusterRestores(ctx, user, namespace, clusterName)
	if err != nil {
		return nil, err
	}
	filtered := []everestv1alpha1.DatabaseClusterRestore{}
	for _, dbbrestore := range list.Items {
		clusterName := dbbrestore.Spec.DBClusterName
		if err := h.enforce(user, rbac.ResourceDatabaseClusterRestores,
			rbac.ActionRead, rbac.ObjectName(namespace, clusterName),
		); errors.Is(err, ErrInsufficientPermissions) {
			continue
		} else if err != nil {
			return nil, err
		}
		filtered = append(filtered, dbbrestore)
	}
	list.Items = filtered
	return list, nil
}

func (h *rbacHandler) CreateDatabaseClusterRestore(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	clusterName := req.Spec.DBClusterName
	namespace := req.GetNamespace()
	if err := h.enforce(user, rbac.ResourceDatabaseClusterRestores, rbac.ActionCreate, rbac.ObjectName(namespace, clusterName)); err != nil {
		return nil, err
	}
	if err := h.enforceDBRestore(user, namespace, clusterName); err != nil {
		return nil, err
	}
	return h.next.CreateDatabaseClusterRestore(ctx, user, req)
}

func (h *rbacHandler) DeleteDatabaseClusterRestore(ctx context.Context, user, namespace, name string) error {
	restore, err := h.next.GetDatabaseClusterRestore(ctx, user, namespace, name)
	if err != nil {
		return fmt.Errorf("GetDatabaseClusterRestore failed: %w", err)
	}
	clusterName := restore.Spec.DBClusterName
	if err := h.enforce(user, rbac.ResourceDatabaseClusterRestores, rbac.ActionDelete, rbac.ObjectName(namespace, clusterName)); err != nil {
		return err
	}
	return h.next.DeleteDatabaseClusterRestore(ctx, user, namespace, name)
}

func (h *rbacHandler) GetDatabaseClusterRestore(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error) {
	restore, err := h.next.GetDatabaseClusterRestore(ctx, user, namespace, name)
	if err != nil {
		return nil, fmt.Errorf("GetDatabaseClusterRestore failed: %w", err)
	}
	clusterName := restore.Spec.DBClusterName
	if err := h.enforce(user, rbac.ResourceDatabaseClusterRestores, rbac.ActionRead, rbac.ObjectName(namespace, clusterName)); err != nil {
		return nil, err
	}
	return restore, nil
}

func (h *rbacHandler) UpdateDatabaseClusterRestore(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	clusterName := req.Spec.DBClusterName
	namespace := req.GetNamespace()
	if err := h.enforce(user, rbac.ResourceDatabaseClusterRestores, rbac.ActionUpdate, rbac.ObjectName(namespace, clusterName)); err != nil {
		return nil, err
	}
	return h.next.UpdateDatabaseClusterRestore(ctx, user, req)
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
