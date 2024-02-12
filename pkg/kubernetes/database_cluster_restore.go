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

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// GetDatabaseClusterRestore returns database cluster restore by name.
func (k *Kubernetes) GetDatabaseClusterRestore(ctx context.Context, namespace, name string) (*everestv1alpha1.DatabaseClusterRestore, error) {
	return k.client.GetDatabaseClusterRestore(ctx, namespace, name)
}

// ListDatabaseClusterRestores returns database cluster restores.
func (k *Kubernetes) ListDatabaseClusterRestores(ctx context.Context, namespace string, options metav1.ListOptions) (*everestv1alpha1.DatabaseClusterRestoreList, error) {
	return k.client.ListDatabaseClusterRestores(ctx, namespace, options)
}
