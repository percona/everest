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

// Package client ...
package client

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

// CreateBackupStorage creates an backupStorage.
func (c *Client) CreateBackupStorage(ctx context.Context, storage *everestv1alpha1.BackupStorage) (*everestv1alpha1.BackupStorage, error) {
	return c.customClientSet.BackupStorage(storage.Namespace).Create(ctx, storage, metav1.CreateOptions{})
}

// UpdateBackupStorage updates an backupStorage.
func (c *Client) UpdateBackupStorage(ctx context.Context, storage *everestv1alpha1.BackupStorage) (*everestv1alpha1.BackupStorage, error) {
	return c.customClientSet.BackupStorage(storage.Namespace).Update(ctx, storage, metav1.UpdateOptions{})
}

// GetBackupStorage returns the backupStorage.
func (c *Client) GetBackupStorage(ctx context.Context, namespace, name string) (*everestv1alpha1.BackupStorage, error) {
	return c.customClientSet.BackupStorage(namespace).Get(ctx, name, metav1.GetOptions{})
}

// ListBackupStorages returns the backupStorage.
func (c *Client) ListBackupStorages(ctx context.Context, namespace string, options metav1.ListOptions) (*everestv1alpha1.BackupStorageList, error) {
	return c.customClientSet.BackupStorage(namespace).List(ctx, options)
}

// DeleteBackupStorage deletes the backupStorage.
func (c *Client) DeleteBackupStorage(ctx context.Context, namespace, name string) error {
	return c.customClientSet.BackupStorage(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}
