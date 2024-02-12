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

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
)

const (
	backupStorageAPIKind = "backupstorages"
)

// BackupStorage returns a db cluster client.
func (c *Client) BackupStorage( //nolint:ireturn
	namespace string,
) BackupStoragesInterface {
	return &client{
		restClient: c.restClient,
		namespace:  namespace,
	}
}

// BackupStoragesInterface supports methods to work with BackupStorages.
type BackupStoragesInterface interface {
	List(ctx context.Context, opts metav1.ListOptions) (*everestv1alpha1.BackupStorageList, error)
	Create(ctx context.Context, storage *everestv1alpha1.BackupStorage, opts metav1.CreateOptions) (*everestv1alpha1.BackupStorage, error)
	Update(ctx context.Context, storage *everestv1alpha1.BackupStorage, opts metav1.UpdateOptions) (*everestv1alpha1.BackupStorage, error)
	Delete(ctx context.Context, name string, opts metav1.DeleteOptions) error
	Get(ctx context.Context, name string, opts metav1.GetOptions) (*everestv1alpha1.BackupStorage, error)
}

type client struct {
	restClient rest.Interface
	namespace  string
}

// Create creates a resource.
func (c *client) Create(
	ctx context.Context,
	storage *everestv1alpha1.BackupStorage,
	opts metav1.CreateOptions,
) (*everestv1alpha1.BackupStorage, error) {
	result := &everestv1alpha1.BackupStorage{}
	err := c.restClient.
		Post().
		Namespace(c.namespace).
		Resource(backupStorageAPIKind).Body(storage).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).Into(result)
	return result, err
}

// Update creates a resource.
func (c *client) Update(
	ctx context.Context,
	storage *everestv1alpha1.BackupStorage,
	opts metav1.UpdateOptions,
) (*everestv1alpha1.BackupStorage, error) {
	result := &everestv1alpha1.BackupStorage{}
	err := c.restClient.
		Put().Name(storage.Name).
		Namespace(c.namespace).
		Resource(backupStorageAPIKind).Body(storage).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).Into(result)
	return result, err
}

// Delete creates a resource.
func (c *client) Delete(
	ctx context.Context,
	name string,
	opts metav1.DeleteOptions,
) error {
	return c.restClient.
		Delete().Name(name).
		Namespace(c.namespace).
		Resource(backupStorageAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).Error()
}

// Get retrieves backup storage based on opts.
func (c *client) Get(
	ctx context.Context,
	name string,
	opts metav1.GetOptions,
) (*everestv1alpha1.BackupStorage, error) {
	result := &everestv1alpha1.BackupStorage{}
	err := c.restClient.
		Get().
		Namespace(c.namespace).
		Resource(backupStorageAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Name(name).
		Do(ctx).
		Into(result)
	return result, err
}

// List retrieves backup storage list based on opts.
func (c *client) List(
	ctx context.Context,
	opts metav1.ListOptions,
) (*everestv1alpha1.BackupStorageList, error) {
	result := &everestv1alpha1.BackupStorageList{}
	err := c.restClient.
		Get().
		Namespace(c.namespace).
		Resource(backupStorageAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).
		Into(result)
	return result, err
}
