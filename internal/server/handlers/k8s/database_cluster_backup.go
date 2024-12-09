package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func (h *k8sHandler) ListDatabaseClusterBackups(ctx context.Context, user, namespace string) (*everestv1alpha1.DatabaseClusterBackupList, error) {
	return h.kubeClient.ListDatabaseClusterBackups(ctx, namespace, metav1.ListOptions{})
}

func (h *k8sHandler) CreateDatabaseClusterBackup(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterBackup) error {
	return nil
}

func (h *k8sHandler) DeleteDatabaseClusterBackup(ctx context.Context, user, namespace, name string) error {
	return nil
}

func (h *k8sHandler) GetDatabaseClusterBackup(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseClusterBackup, error) {
	return h.kubeClient.GetDatabaseClusterBackup(ctx, namespace, name)
}
