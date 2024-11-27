// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Package kubernetes ...
package kubernetes

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

// ListDatabaseClusters returns list of managed database clusters.
func (k *Kubernetes) ListDatabaseClusters(ctx context.Context, namespace string) (*everestv1alpha1.DatabaseClusterList, error) {
	return k.client.ListDatabaseClusters(ctx, namespace, metav1.ListOptions{})
}

// GetDatabaseCluster returns database clusters by provided name.
func (k *Kubernetes) GetDatabaseCluster(ctx context.Context, namespace, name string) (*everestv1alpha1.DatabaseCluster, error) {
	return k.client.GetDatabaseCluster(ctx, namespace, name)
}

// DeleteDatabaseClusters deletes all database clusters in provided namespace.
// This function will wait until all clusters are deleted.
func (k *Kubernetes) DeleteDatabaseClusters(ctx context.Context, namespace string) error {
	return wait.PollUntilContextTimeout(ctx, pollInterval, pollTimeout, true, func(ctx context.Context) (bool, error) {
		list, err := k.ListDatabaseClusters(ctx, namespace)
		if err != nil {
			return false, err
		}
		if len(list.Items) == 0 {
			return true, nil
		}
		for _, cluster := range list.Items {
			if err := k.DeleteDatabaseCluster(ctx, cluster.GetNamespace(), cluster.GetName()); err != nil {
				return false, err
			}
		}
		return false, nil
	})
}

// PatchDatabaseCluster patches CR of managed Database cluster.
func (k *Kubernetes) PatchDatabaseCluster(cluster *everestv1alpha1.DatabaseCluster) error {
	return k.client.ApplyObject(cluster)
}

// DeleteDatabaseCluster deletes database cluster.
func (k *Kubernetes) DeleteDatabaseCluster(ctx context.Context, namespace, name string) error {
	cluster, err := k.client.GetDatabaseCluster(ctx, namespace, name)
	if err != nil {
		return err
	}
	cluster.TypeMeta.APIVersion = databaseClusterAPIVersion
	cluster.TypeMeta.Kind = databaseClusterKind
	return k.client.DeleteObject(cluster)
}

// DatabasesExist checks if databases exist in provided at least one of the provided namespaces.
// If namespaces are not provided, it checks in all namespaces
func (k *Kubernetes) DatabasesExist(ctx context.Context, namespaces ...string) (bool, error) {
	all, err := k.getAllDatabases(ctx)
	if err != nil {
		return false, err
	}
	if len(namespaces) == 0 {
		return len(all) > 0, nil
	}

	for _, ns := range namespaces {
		if _, ok := all[ns]; ok {
			return true, nil
		}
	}
	return false, nil
}

func (k *Kubernetes) getAllDatabases(ctx context.Context) (map[string]everestv1alpha1.DatabaseClusterList, error) {
	res := make(map[string]everestv1alpha1.DatabaseClusterList)
	namespaces, err := k.GetDBNamespaces(ctx)
	if ctrlclient.IgnoreNotFound(err) != nil {
		return nil, err
	}
	for _, ns := range namespaces {
		clusters, err := k.ListDatabaseClusters(ctx, ns)
		if err != nil {
			return nil, err
		}
		if len(clusters.Items) == 0 {
			continue
		}
		res[ns] = *clusters
	}
	return res, nil
}
