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

// Package helmutils provides common helpers for helm tools.
package helmutils

import (
	"go.uber.org/zap"

	"github.com/percona/everest/pkg/kubernetes"
)

// NewClient returns a new Kubernetes client.
// If kubeconfigPath is empty, it will use the in-cluster configuration.
func NewClient(l *zap.SugaredLogger, kubeconfigPath string) (kubernetes.KubernetesConnector, error) { //nolint:ireturn
	if kubeconfigPath != "" {
		return kubernetes.New(kubeconfigPath, l)
	}
	return kubernetes.NewInCluster(l)
}
