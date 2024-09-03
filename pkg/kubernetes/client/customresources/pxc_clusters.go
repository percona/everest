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

// Package customresources provides methods to work with custom everest k8s resources.
//
//nolint:dupl
package customresources

import (
	"context"

	pxcv1 "github.com/percona/percona-xtradb-cluster-operator/pkg/apis/pxc/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
)

const (
	pxcClusterAPIKind = "perconaxtradbclusters"
)

// MonitoringConfig returns a db cluster monitoringConfigClient.
func (c *Client) PXCCluster( //nolint:ireturn
	namespace string,
) PXCClustersInterface {
	return &pxcCluster{
		restClient: c.restClient,
		namespace:  namespace,
	}
}

// PXCClustersInterface supports methods to work with PXCClusters.
type PXCClustersInterface interface {
	List(ctx context.Context, opts metav1.ListOptions) (*pxcv1.PerconaXtraDBClusterList, error)
	Create(ctx context.Context, storage *pxcv1.PerconaXtraDBCluster, opts metav1.CreateOptions) (*pxcv1.PerconaXtraDBCluster, error)
	Update(ctx context.Context, storage *pxcv1.PerconaXtraDBCluster, opts metav1.UpdateOptions) (*pxcv1.PerconaXtraDBCluster, error)
	Delete(ctx context.Context, name string, opts metav1.DeleteOptions) error
	Get(ctx context.Context, name string, opts metav1.GetOptions) (*pxcv1.PerconaXtraDBCluster, error)
}

type pxcCluster struct {
	restClient rest.Interface
	namespace  string
}

// Create creates a monitoring config.
func (c *pxcCluster) Create(
	ctx context.Context,
	res *pxcv1.PerconaXtraDBCluster,
	opts metav1.CreateOptions,
) (*pxcv1.PerconaXtraDBCluster, error) {
	result := &pxcv1.PerconaXtraDBCluster{}
	err := c.restClient.
		Post().
		Namespace(c.namespace).
		Resource(pxcClusterAPIKind).Body(res).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).Into(result)
	return result, err
}

// Update updates a monitoring config.
func (c *pxcCluster) Update(
	ctx context.Context,
	res *pxcv1.PerconaXtraDBCluster,
	opts metav1.UpdateOptions,
) (*pxcv1.PerconaXtraDBCluster, error) {
	result := &pxcv1.PerconaXtraDBCluster{}
	err := c.restClient.
		Put().Name(res.Name).
		Namespace(c.namespace).
		Resource(pxcClusterAPIKind).Body(res).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).Into(result)
	return result, err
}

// Delete creates a resource.
func (c *pxcCluster) Delete(
	ctx context.Context,
	name string,
	opts metav1.DeleteOptions,
) error {
	return c.restClient.
		Delete().Name(name).
		Namespace(c.namespace).
		Resource(pxcClusterAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).Error()
}

// Get retrieves a monitoring config based on opts.
func (c *pxcCluster) Get(
	ctx context.Context,
	name string,
	opts metav1.GetOptions,
) (*pxcv1.PerconaXtraDBCluster, error) {
	result := &pxcv1.PerconaXtraDBCluster{}
	err := c.restClient.
		Get().
		Namespace(c.namespace).
		Resource(pxcClusterAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Name(name).
		Do(ctx).
		Into(result)
	return result, err
}

// List retrieves a monitoring configs list based on opts.
func (c *pxcCluster) List(
	ctx context.Context,
	opts metav1.ListOptions,
) (*pxcv1.PerconaXtraDBClusterList, error) {
	result := &pxcv1.PerconaXtraDBClusterList{}
	err := c.restClient.
		Get().
		Namespace(c.namespace).
		Resource(pxcClusterAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).
		Into(result)
	return result, err
}
