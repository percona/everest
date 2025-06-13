package rbac

import (
	"context"
	"errors"
	"fmt"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
	"github.com/percona/everest/pkg/rbac"
)

func (h *rbacHandler) ListMonitoringInstances(ctx context.Context, cluster, namespace string) (*everestv1alpha1.MonitoringConfigList, error) {
	list, err := h.next.ListMonitoringInstances(ctx, cluster, namespace)
	if err != nil {
		return nil, fmt.Errorf("ListMonitoringInstances failed: %w", err)
	}
	filtered := []everestv1alpha1.MonitoringConfig{}
	for _, mon := range list.Items {
		if err := h.enforce(ctx, rbac.ResourceMonitoringInstances, rbac.ActionRead, rbac.ObjectName(namespace, mon.GetName())); errors.Is(err, ErrInsufficientPermissions) {
			continue
		} else if err != nil {
			return nil, fmt.Errorf("enforce failed: %w", err)
		}
		filtered = append(filtered, mon)
	}
	list.Items = filtered
	return list, nil
}

func (h *rbacHandler) CreateMonitoringInstance(ctx context.Context, cluster, namespace string, req *api.CreateMonitoringInstanceJSONRequestBody) (*everestv1alpha1.MonitoringConfig, error) {
	if err := h.enforce(ctx, rbac.ResourceMonitoringInstances, rbac.ActionCreate, rbac.ObjectName(namespace, req.Name)); err != nil {
		return nil, err
	}
	return h.next.CreateMonitoringInstance(ctx, cluster, namespace, req)
}

func (h *rbacHandler) DeleteMonitoringInstance(ctx context.Context, cluster, namespace, name string) error {
	if err := h.enforce(ctx, rbac.ResourceMonitoringInstances, rbac.ActionDelete, rbac.ObjectName(namespace, name)); err != nil {
		return err
	}
	return h.next.DeleteMonitoringInstance(ctx, cluster, namespace, name)
}

func (h *rbacHandler) GetMonitoringInstance(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.MonitoringConfig, error) {
	if err := h.enforce(ctx, rbac.ResourceMonitoringInstances, rbac.ActionRead, rbac.ObjectName(namespace, name)); err != nil {
		return nil, err
	}
	return h.next.GetMonitoringInstance(ctx, cluster, namespace, name)
}

func (h *rbacHandler) UpdateMonitoringInstance(ctx context.Context, cluster, namespace, name string, req *api.UpdateMonitoringInstanceJSONRequestBody) (*everestv1alpha1.MonitoringConfig, error) {
	if err := h.enforce(ctx, rbac.ResourceMonitoringInstances, rbac.ActionUpdate, rbac.ObjectName(namespace, name)); err != nil {
		return nil, err
	}
	return h.next.UpdateMonitoringInstance(ctx, cluster, namespace, name, req)
}
