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

// ListBackupStorages returns list of managed backup storages.
func (k *Kubernetes) ListBackupStorages(ctx context.Context, namespace string) (*everestv1alpha1.BackupStorageList, error) {
	return k.client.ListBackupStorages(ctx, namespace, metav1.ListOptions{})
}

// GetBackupStorage returns backup storages by provided name.
func (k *Kubernetes) GetBackupStorage(ctx context.Context, namespace, name string) (*everestv1alpha1.BackupStorage, error) {
	return k.client.GetBackupStorage(ctx, namespace, name)
}

// CreateBackupStorage returns backup storages by provided name.
func (k *Kubernetes) CreateBackupStorage(ctx context.Context, storage *everestv1alpha1.BackupStorage) error {
	return k.client.CreateBackupStorage(ctx, storage)
}

// UpdateBackupStorage returns backup storages by provided name.
func (k *Kubernetes) UpdateBackupStorage(ctx context.Context, storage *everestv1alpha1.BackupStorage) error {
	return k.client.UpdateBackupStorage(ctx, storage)
}

// DeleteBackupStorage returns backup storages by provided name.
func (k *Kubernetes) DeleteBackupStorage(ctx context.Context, namespace, name string) error {
	return k.client.DeleteBackupStorage(ctx, namespace, name)
}

// IsBackupStorageUsed checks if a backup storage in a given namespace is used by any clusters
// in that namespace.
//
//nolint:cyclop
func (k *Kubernetes) IsBackupStorageUsed(ctx context.Context, namespace, name string) (bool, error) {
	_, err := k.client.GetBackupStorage(ctx, namespace, name)
	if err != nil {
		return false, err
	}

	// Check if it is in use by clusters?
	clusters, err := k.client.ListDatabaseClusters(ctx, namespace, metav1.ListOptions{})
	if err != nil {
		return false, err
	}
	for _, cluster := range clusters.Items {
		for _, sched := range cluster.Spec.Backup.Schedules {
			if sched.Enabled && sched.BackupStorageName == name {
				return true, nil
			}
		}
	}

	// Check if it is in use by backups?
	backups, err := k.client.ListDatabaseClusterBackups(ctx, namespace, metav1.ListOptions{})
	if err != nil {
		return false, err
	}
	for _, backup := range backups.Items {
		if backup.Spec.BackupStorageName == name {
			return true, nil
		}
	}

	// Check if it is in use by restores?
	restores, err := k.client.ListDatabaseClusterRestores(ctx, namespace, metav1.ListOptions{})
	if err != nil {
		return false, err
	}
	for _, restore := range restores.Items {
		src := restore.Spec.DataSource.BackupSource
		if src != nil && src.BackupStorageName == name {
			return true, nil
		}
		for _, db := range clusters.Items {
			if db.GetName() == restore.Spec.DBClusterName && !restore.IsComplete() {
				return true, nil
			}
		}
	}
	return false, nil
}
