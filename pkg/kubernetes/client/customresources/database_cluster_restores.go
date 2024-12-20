// Package customresources ...
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
package customresources

import (
	"context"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

const (
	dbClusterRestoresAPIKind = "databaseclusterrestores"
)

// DBClusterRestores returns a db cluster client.
func (c *Client) DBClusterRestores(namespace string) DBClusterRestoreInterface { //nolint:ireturn
	return &dbClusterRestoreClient{
		restClient: c.restClient,
		namespace:  namespace,
	}
}

type dbClusterRestoreClient struct {
	restClient rest.Interface
	namespace  string
}

// DBClusterRestoreInterface supports list, get and watch methods.
type DBClusterRestoreInterface interface {
	List(ctx context.Context, opts metav1.ListOptions) (*everestv1alpha1.DatabaseClusterRestoreList, error)
	Get(ctx context.Context, name string, options metav1.GetOptions) (*everestv1alpha1.DatabaseClusterRestore, error)
	Watch(ctx context.Context, opts metav1.ListOptions) (watch.Interface, error)
	Create(ctx context.Context, restore *everestv1alpha1.DatabaseClusterRestore, opts metav1.CreateOptions) (*everestv1alpha1.DatabaseClusterRestore, error)
	Update(ctx context.Context, restore *everestv1alpha1.DatabaseClusterRestore, opts metav1.UpdateOptions) (*everestv1alpha1.DatabaseClusterRestore, error)
	Delete(ctx context.Context, name string, opts metav1.DeleteOptions) error
}

// Create creates a resource.
func (c *dbClusterRestoreClient) Create(
	ctx context.Context,
	restore *everestv1alpha1.DatabaseClusterRestore,
	opts metav1.CreateOptions,
) (*everestv1alpha1.DatabaseClusterRestore, error) {
	result := &everestv1alpha1.DatabaseClusterRestore{}
	err := c.restClient.
		Post().
		Namespace(c.namespace).
		Resource(dbClusterRestoresAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Body(restore).
		Do(ctx).
		Into(result)
	return result, err
}

// Update updates a resource.
func (c *dbClusterRestoreClient) Update(
	ctx context.Context,
	restore *everestv1alpha1.DatabaseClusterRestore,
	opts metav1.UpdateOptions,
) (*everestv1alpha1.DatabaseClusterRestore, error) {
	result := &everestv1alpha1.DatabaseClusterRestore{}
	err := c.restClient.
		Put().
		Namespace(c.namespace).
		Resource(dbClusterRestoresAPIKind).
		Name(restore.Name).
		VersionedParams(&opts, scheme.ParameterCodec).
		Body(restore).
		Do(ctx).
		Into(result)
	return result, err
}

// Delete deletes a resource.
func (c *dbClusterRestoreClient) Delete(
	ctx context.Context,
	name string,
	opts metav1.DeleteOptions,
) error {
	return c.restClient.
		Delete().
		Namespace(c.namespace).
		Resource(dbClusterRestoresAPIKind).
		Name(name).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).
		Error()
}

// List lists database cluster restores based on opts.
func (c *dbClusterRestoreClient) List(ctx context.Context, opts metav1.ListOptions) (*everestv1alpha1.DatabaseClusterRestoreList, error) {
	result := &everestv1alpha1.DatabaseClusterRestoreList{}
	err := c.restClient.
		Get().
		Namespace(c.namespace).
		Resource(dbClusterRestoresAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).
		Into(result)
	return result, err
}

// Get retrieves database cluster restore based on opts.
func (c *dbClusterRestoreClient) Get(
	ctx context.Context,
	name string,
	opts metav1.GetOptions,
) (*everestv1alpha1.DatabaseClusterRestore, error) {
	result := &everestv1alpha1.DatabaseClusterRestore{}
	err := c.restClient.
		Get().
		Namespace(c.namespace).
		Resource(dbClusterRestoresAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Name(name).
		Do(ctx).
		Into(result)
	return result, err
}

// Watch starts a watch based on opts.
func (c *dbClusterRestoreClient) Watch( //nolint:ireturn
	ctx context.Context,
	opts metav1.ListOptions,
) (watch.Interface, error) {
	opts.Watch = true
	return c.restClient.
		Get().
		Namespace(c.namespace).
		Resource(dbClusterRestoresAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Watch(ctx)
}
