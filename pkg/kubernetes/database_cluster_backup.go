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

package kubernetes

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

// GetDatabaseClusterBackup returns database cluster backup by name.
func (k *Kubernetes) GetDatabaseClusterBackup(ctx context.Context, namespace, name string) (*everestv1alpha1.DatabaseClusterBackup, error) {
	return k.client.GetDatabaseClusterBackup(ctx, namespace, name)
}

// ListDatabaseClusterBackups returns database cluster backups.
func (k *Kubernetes) ListDatabaseClusterBackups(ctx context.Context, namespace string, options metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
	return k.client.ListDatabaseClusterBackups(ctx, namespace, options)
}

// UpdateDatabaseClusterBackup updates database cluster backup.
func (k *Kubernetes) UpdateDatabaseClusterBackup(ctx context.Context, backup *everestv1alpha1.DatabaseClusterBackup) (*everestv1alpha1.DatabaseClusterBackup, error) {
	return k.client.UpdateDatabaseClusterBackup(ctx, backup)
}

// DeleteDatabaseClusterBackup deletes database cluster backup.
func (k *Kubernetes) DeleteDatabaseClusterBackup(ctx context.Context, namespace, name string) error {
	return k.client.DeleteDatabaseClusterBackup(ctx, namespace, name)
}

// CreateDatabaseClusterBackup creates database cluster backup.
func (k *Kubernetes) CreateDatabaseClusterBackup(ctx context.Context, backup *everestv1alpha1.DatabaseClusterBackup) (*everestv1alpha1.DatabaseClusterBackup, error) {
	return k.client.CreateDatabaseClusterBackup(ctx, backup.GetNamespace(), backup)
}
