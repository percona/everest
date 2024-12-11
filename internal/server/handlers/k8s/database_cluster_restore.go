package k8s

import (
	"context"
	"errors"
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

func (h *k8sHandler) ListDatabaseClusterRestores(ctx context.Context, _, namespace, clusterName string) (*everestv1alpha1.DatabaseClusterRestoreList, error) {
	return h.kubeClient.ListDatabaseClusterRestores(ctx, namespace, metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{
			MatchLabels: map[string]string{
				"clusterName": clusterName,
			},
		}),
	})
}

func (h *k8sHandler) CreateDatabaseClusterRestore(ctx context.Context, _ string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	dbCluster, err := h.kubeClient.GetDatabaseCluster(ctx, req.Spec.DBClusterName, req.GetNamespace())
	if err != nil {
		return nil, fmt.Errorf("failed to GetDatabaseCluster: %w", err)
	}
	if dbCluster.Status.Status == everestv1alpha1.AppStateRestoring {
		return nil, errors.New("another restore is already in progress")
	}
	return h.kubeClient.CreateDatabaseClusterRestore(ctx, req)
}

func (h *k8sHandler) DeleteDatabaseClusterRestore(ctx context.Context, _, namespace, name string) error {
	return h.kubeClient.DeleteDatabaseClusterRestore(ctx, namespace, name)
}

func (h *k8sHandler) GetDatabaseClusterRestore(ctx context.Context, _, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return h.kubeClient.GetDatabaseClusterRestore(ctx, namespace, name)
}

func (h *k8sHandler) UpdateDatabaseClusterRestore(ctx context.Context, _ string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return h.kubeClient.UpdateDatabaseClusterRestore(ctx, req)
}
