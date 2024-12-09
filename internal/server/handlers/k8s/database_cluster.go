package rbac

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/api"
)

func (h *k8sHandler) CreateDatabaseCluster(ctx context.Context, user string, db *everestv1alpha1.DatabaseCluster) error {
	return nil // todo
}

func (h *k8sHandler) ListDatabaseClusters(ctx context.Context, user, namespace string) (*everestv1alpha1.DatabaseClusterList, error) {
	return h.kubeClient.ListDatabaseClusters(ctx, namespace)
}

func (h *k8sHandler) DeleteDatabaseCluster(ctx context.Context, user, namespace, name string, req *api.DeleteDatabaseClusterParams) error {
	return h.kubeClient.DeleteDatabaseCluster(ctx, namespace, name)
}

func (h *k8sHandler) UpdateDatabaseCluster(ctx context.Context, user string, db *everestv1alpha1.DatabaseCluster) error {
	return nil
}

func (h *k8sHandler) GetDatabaseCluster(ctx context.Context, user, namespace, name string) (*everestv1alpha1.DatabaseCluster, error) {
	return h.kubeClient.GetDatabaseCluster(ctx, namespace, name)
}

func (h *k8sHandler) GetDatabaseClusterCredentials(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterCredential, error) {
	return nil, nil
}

func (h *k8sHandler) GetDatabaseClusterComponents(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterComponents, error) {
	return nil, nil
}

func (h *k8sHandler) GetDatabaseClusterPitr(ctx context.Context, user, namespace, name string) (*api.DatabaseClusterPitr, error) {
	return nil, nil
}
