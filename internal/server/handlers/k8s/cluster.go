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

package k8s

import (
	"context"
	"fmt"

	"github.com/percona/everest/internal/server/handlers"
)

// ListClusters returns a list of clusters.
func (h *k8sHandler) ListClusters(ctx context.Context) ([]handlers.APICluster, error) {
	clusterList, err := h.kubeConnector.Clusters().List(ctx)
	if err != nil {
		return nil, err
	}
	apiClusters := make([]handlers.APICluster, 0, len(clusterList.Items))
	for _, c := range clusterList.Items {
		apiClusters = append(apiClusters, handlers.APICluster{
			Name:   c.Name,
			Server: c.Server,
		})
	}
	return apiClusters, nil
}

// GetCluster returns a cluster by name.
func (h *k8sHandler) GetCluster(ctx context.Context, name string) (*handlers.APICluster, error) {
	clusterList, err := h.kubeConnector.Clusters().List(ctx)
	if err != nil {
		return nil, err
	}
	for _, c := range clusterList.Items {
		if c.Name == name {
			return &handlers.APICluster{
				Name:   c.Name,
				Server: c.Server,
			}, nil
		}
	}
	return nil, fmt.Errorf("cluster not found: %s", name)
}
