package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

func (h *k8sHandler) ListMonitoringInstances(ctx context.Context, user, namespace string) (*everestv1alpha1.MonitoringConfigList, error) {
	return h.kubeClient.ListMonitoringConfigs(ctx, namespace)
}

func (h *k8sHandler) CreateMonitoringInstance(ctx context.Context, user string, req *everestv1alpha1.MonitoringConfig) error {
	return h.kubeClient.CreateMonitoringConfig(ctx, req)
}

func (h *k8sHandler) DeleteMonitoringInstance(ctx context.Context, user, namespace, name string) error {
	return h.kubeClient.DeleteMonitoringConfig(ctx, namespace, name)
}

func (h *k8sHandler) GetMonitoringInstance(ctx context.Context, user, namespace, name string) (*everestv1alpha1.MonitoringConfig, error) {
	return h.kubeClient.GetMonitoringConfig(ctx, namespace, name)
}

func (h *k8sHandler) UpdateMonitoringInstance(ctx context.Context, user string, req *everestv1alpha1.MonitoringConfig) error {
	return h.kubeClient.UpdateMonitoringConfig(ctx, req)
}
