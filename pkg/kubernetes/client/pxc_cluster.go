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

	pxcv1 "github.com/percona/percona-xtradb-cluster-operator/pkg/apis/pxc/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// ListPXCClusters returns the PXCClusters.
func (c *Client) ListPXCClusters(ctx context.Context, namespace string) (*pxcv1.PerconaXtraDBClusterList, error) {
	return c.customClientSet.PXCCluster(namespace).List(ctx, metav1.ListOptions{})
}

// UpdatePXCCluster updates a PerconaXtraDBCluster.
func (c *Client) UpdatePXCCluster(ctx context.Context, db *pxcv1.PerconaXtraDBCluster) error {
	_, err := c.customClientSet.PXCCluster(db.Namespace).Update(ctx, db, metav1.UpdateOptions{})
	return err
}
