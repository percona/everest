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

// CreateDatabaseCluster creates database cluster.
func (k *Kubernetes) CreateDatabaseCluster(cluster *everestv1alpha1.DatabaseCluster) error {
	if cluster.ObjectMeta.Annotations == nil {
		cluster.ObjectMeta.Annotations = make(map[string]string)
	}
	cluster.ObjectMeta.Annotations[managedByKey] = "pmm"
	return k.client.ApplyObject(cluster)
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
