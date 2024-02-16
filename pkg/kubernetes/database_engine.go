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

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

// ListDatabaseEngines returns list of managed database clusters.
func (k *Kubernetes) ListDatabaseEngines(ctx context.Context, namespace string) (*everestv1alpha1.DatabaseEngineList, error) {
	return k.client.ListDatabaseEngines(ctx, namespace)
}

// GetDatabaseEngine returns database clusters by provided name.
func (k *Kubernetes) GetDatabaseEngine(ctx context.Context, namespace, name string) (*everestv1alpha1.DatabaseEngine, error) {
	return k.client.GetDatabaseEngine(ctx, namespace, name)
}
