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
	"fmt"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	backupStorageNameLabelTmpl = "backupStorage-%s"
	backupStorageLabelValue    = "used"
)

// ListBackupStorages returns list of managed backup storages.
func (k *Kubernetes) ListBackupStorages(ctx context.Context) (*everestv1alpha1.BackupStorageList, error) {
	return k.client.ListBackupStorages(ctx, metav1.ListOptions{})
}

// GetBackupStorage returns backup storages by provided name.
func (k *Kubernetes) GetBackupStorage(ctx context.Context, name string) (*everestv1alpha1.BackupStorage, error) {
	return k.client.GetBackupStorage(ctx, name)
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
func (k *Kubernetes) DeleteBackupStorage(ctx context.Context, name string) error {
	return k.client.DeleteBackupStorage(ctx, name)
}

// IsBackupStorageUsed checks that a backup storage by provided name is used across k8s cluster.
func (k *Kubernetes) IsBackupStorageUsed(ctx context.Context, backupStorageName string) (bool, error) {
	_, err := k.client.GetBackupStorage(ctx, backupStorageName)
	if err != nil {
		return false, err
	}

	namespaces, err := k.GetDBNamespaces(ctx, k.Namespace())
	if err != nil {
		return false, err
	}

	options := metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{
			MatchLabels: map[string]string{
				fmt.Sprintf(backupStorageNameLabelTmpl, backupStorageName): backupStorageLabelValue,
			},
		}),
	}

	for _, namespace := range namespaces {
		list, err := k.client.ListDatabaseClusters(ctx, namespace, options)
		if err != nil {
			return false, err
		}
		if len(list.Items) > 0 {
			return true, nil
		}
		bList, err := k.client.ListDatabaseClusterBackups(ctx, namespace, options)
		if err != nil {
			return false, err
		}
		if len(bList.Items) > 0 {
			return true, nil
		}
		rList, err := k.client.ListDatabaseClusterRestores(ctx, namespace, options)
		if err != nil {
			return false, err
		}
		if len(rList.Items) > 0 {
			return true, nil
		}
	}

	return false, nil
}
