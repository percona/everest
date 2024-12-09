package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func (h *k8sHandler) ListDatabaseClusterRestores(ctx context.Context, user, namespace string) (*everestv1alpha1.DatabaseClusterRestoreList, error) {
	return h.kubeClient.ListDatabaseClusterRestores(ctx, namespace, metav1.ListOptions{})
}

func (h *k8sHandler) CreateDatabaseClusterRestore(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterRestore) error {
	return nil
}

func (h *k8sHandler) DeleteDatabaseClusterRestore(ctx context.Context, user, namespace, name string) error {
	return nil
}

func (h *k8sHandler) GetDatabaseClusterRestore(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return nil, nil
}

func (h *k8sHandler) UpdateDatabaseClusterRestore(ctx context.Context, user string, req *everestv1alpha1.DatabaseClusterRestore) error {
	return nil
}
