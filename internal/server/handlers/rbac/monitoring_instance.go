package rbac

import (
	"context"

	"github.com/percona/everest/api"
)

func (h *rbacHandler) ListMonitoringInstances(ctx context.Context, user, namespace string) ([]*api.MonitoringInstance, error) {
	return nil, nil
}

func (h *rbacHandler) CreateMonitoringInstance(ctx context.Context, user string, req *api.MonitoringInstance) error {
	return nil
}

func (h *rbacHandler) DeleteMonitoringInstance(ctx context.Context, user, namespace, name string) error {
	return nil
}

func (h *rbacHandler) GetMonitoringInstance(ctx context.Context, user, namespace, name string) (*api.MonitoringInstance, error) {
	return nil, nil
}

func (h *rbacHandler) UpdateMonitoringInstance(ctx context.Context, user string, req *api.MonitoringInstance) error {
	return nil
}
