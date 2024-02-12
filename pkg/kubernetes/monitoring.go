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

import "context"

// DeleteAllMonitoringResources deletes all resources related to monitoring from k8s cluster.
// If namespace is empty, a default namespace is used.
func (k *Kubernetes) DeleteAllMonitoringResources(ctx context.Context, namespace string) error {
	return k.client.DeleteAllMonitoringResources(ctx, namespace)
}
