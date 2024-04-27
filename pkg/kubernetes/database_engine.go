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
	"time"

	backoff "github.com/cenkalti/backoff/v4"

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

// UpdateDatabaseEngine updates the provided database engine.
func (k *Kubernetes) UpdateDatabaseEngine(ctx context.Context, namespace string, engine *everestv1alpha1.DatabaseEngine) (*everestv1alpha1.DatabaseEngine, error) {
	return k.client.UpdateDatabaseEngine(ctx, namespace, engine)
}

// SetDatabaseEngineLock sets the lock on the database engine.
// The lock is automatically set to false once everest-operator completes its upgrade.
func (k *Kubernetes) SetDatabaseEngineLock(ctx context.Context, namespace, name string, locked bool) error {
	// We wrap this logic into a retry block to reduce the chances of conflicts.
	var b backoff.BackOff
	b = backoff.NewConstantBackOff(5 * time.Second)
	b = backoff.WithMaxRetries(b, 5)
	b = backoff.WithContext(b, ctx)
	return backoff.Retry(func() error {
		engine, err := k.client.GetDatabaseEngine(ctx, namespace, name)
		if err != nil {
			return err
		}
		annotations := engine.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}
		annotations[everestv1alpha1.DatabaseOperatorUpgradeLockAnnotation] = "true"
		if !locked {
			delete(annotations, everestv1alpha1.DatabaseOperatorUpgradeLockAnnotation)
		}
		engine.SetAnnotations(annotations)
		_, err = k.client.UpdateDatabaseEngine(ctx, namespace, engine)
		return err
	},
		b,
	)
}
