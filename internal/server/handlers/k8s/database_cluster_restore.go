package k8s

import (
	"context"
	"errors"
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"github.com/percona/everest/pkg/common"
)

func (h *k8sHandler) ListDatabaseClusterRestores(ctx context.Context, cluster, namespace, clusterName string) (*everestv1alpha1.DatabaseClusterRestoreList, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not get kube connector"))
	}

	return connector.ListDatabaseClusterRestores(ctx,
		ctrlclient.InNamespace(namespace),
		ctrlclient.MatchingLabels{common.DatabaseClusterNameLabel: clusterName},
	)
}

func (h *k8sHandler) CreateDatabaseClusterRestore(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not get kube connector"))
	}

	dbCluster, err := connector.GetDatabaseCluster(ctx, types.NamespacedName{Namespace: req.GetNamespace(), Name: req.Spec.DBClusterName})
	if err != nil {
		return nil, fmt.Errorf("failed to GetDatabaseCluster: %w", err)
	}
	if dbCluster.Status.Status == everestv1alpha1.AppStateRestoring {
		return nil, errors.New("another restore is already in progress")
	}
	return connector.CreateDatabaseClusterRestore(ctx, req)
}

func (h *k8sHandler) DeleteDatabaseClusterRestore(ctx context.Context, cluster, namespace, name string) error {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return errors.Join(err, errors.New("could not get kube connector"))
	}

	delObj := &everestv1alpha1.DatabaseClusterRestore{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: namespace,
			Name:      name,
		},
	}
	return connector.DeleteDatabaseClusterRestore(ctx, delObj)
}

func (h *k8sHandler) GetDatabaseClusterRestore(ctx context.Context, cluster, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not get kube connector"))
	}

	return connector.GetDatabaseClusterRestore(ctx, types.NamespacedName{Namespace: namespace, Name: name})
}

func (h *k8sHandler) UpdateDatabaseClusterRestore(ctx context.Context, cluster string, req *everestv1alpha1.DatabaseClusterRestore) (*everestv1alpha1.DatabaseClusterRestore, error) {
	connector, err := h.Connector(ctx, cluster)
	if err != nil {
		return nil, errors.Join(err, errors.New("could not get kube connector"))
	}

	return connector.UpdateDatabaseClusterRestore(ctx, req)
}
