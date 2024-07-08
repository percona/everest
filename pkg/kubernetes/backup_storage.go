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

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

const (
	backupStorageNameLabelTmpl = "backupStorage-%s"
	backupStorageLabelValue    = "used"
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

// IsBackupStorageUsed checks that a backup storage by provided name is used across k8s cluster.
// Optionally you can provide a list of namespaces which shall be checked. If not provided, all namespaces are checked.
func (k *Kubernetes) IsBackupStorageUsed(ctx context.Context, namespace, backupStorageName string, nsList []string) (bool, error) {
	_, err := k.client.GetBackupStorage(ctx, namespace, backupStorageName)
	if err != nil {
		return false, err
	}

	namespaces := nsList
	if len(nsList) == 0 {
		namespaces, err = k.GetDBNamespaces(ctx)
		if err != nil {
			return false, err
		}
	}

	options := metav1.ListOptions{
		LabelSelector: metav1.FormatLabelSelector(&metav1.LabelSelector{
			MatchLabels: map[string]string{
				fmt.Sprintf(backupStorageNameLabelTmpl, backupStorageName): backupStorageLabelValue,
			},
		}),
	}

	for _, namespace := range namespaces {
		dblist, err := k.client.ListDatabaseClusters(ctx, namespace, options)
		if err != nil {
			return false, err
		}
		if len(dblist.Items) > 0 {
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
		for _, restore := range rList.Items {
			for _, db := range dblist.Items {
				if restore.Spec.DBClusterName == db.Name && !restore.IsComplete(db.Spec.Engine.Type) {
					return true, nil
				}
			}
		}
	}

	return false, nil
}
