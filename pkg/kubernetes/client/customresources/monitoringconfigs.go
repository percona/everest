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
	monitoringConfigAPIKind = "monitoringconfigs"
)

// MonitoringConfig returns a db cluster monitoringConfigClient.
func (c *Client) MonitoringConfig( //nolint:ireturn
	namespace string,
) MonitoringConfigsInterface {
	return &monitoringConfigClient{
		restClient: c.restClient,
		namespace:  namespace,
	}
}

// MonitoringConfigsInterface supports methods to work with MonitoringConfigs.
type MonitoringConfigsInterface interface {
	List(ctx context.Context, opts metav1.ListOptions) (*everestv1alpha1.MonitoringConfigList, error)
	Create(ctx context.Context, storage *everestv1alpha1.MonitoringConfig, opts metav1.CreateOptions) (*everestv1alpha1.MonitoringConfig, error)
	Update(ctx context.Context, storage *everestv1alpha1.MonitoringConfig, opts metav1.UpdateOptions) (*everestv1alpha1.MonitoringConfig, error)
	Delete(ctx context.Context, name string, opts metav1.DeleteOptions) error
	Get(ctx context.Context, name string, opts metav1.GetOptions) (*everestv1alpha1.MonitoringConfig, error)
}

type monitoringConfigClient struct {
	restClient rest.Interface
	namespace  string
}

// Create creates a monitoring config.
func (c *monitoringConfigClient) Create(
	ctx context.Context,
	storage *everestv1alpha1.MonitoringConfig,
	opts metav1.CreateOptions,
) (*everestv1alpha1.MonitoringConfig, error) {
	result := &everestv1alpha1.MonitoringConfig{}
	err := c.restClient.
		Post().
		Namespace(c.namespace).
		Resource(monitoringConfigAPIKind).Body(storage).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).Into(result)
	return result, err
}

// Update updates a monitoring config.
func (c *monitoringConfigClient) Update(
	ctx context.Context,
	storage *everestv1alpha1.MonitoringConfig,
	opts metav1.UpdateOptions,
) (*everestv1alpha1.MonitoringConfig, error) {
	result := &everestv1alpha1.MonitoringConfig{}
	err := c.restClient.
		Put().Name(storage.Name).
		Namespace(c.namespace).
		Resource(monitoringConfigAPIKind).Body(storage).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).Into(result)
	return result, err
}

// Delete creates a resource.
func (c *monitoringConfigClient) Delete(
	ctx context.Context,
	name string,
	opts metav1.DeleteOptions,
) error {
	return c.restClient.
		Delete().Name(name).
		Namespace(c.namespace).
		Resource(monitoringConfigAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).Error()
}

// Get retrieves a monitoring config based on opts.
func (c *monitoringConfigClient) Get(
	ctx context.Context,
	name string,
	opts metav1.GetOptions,
) (*everestv1alpha1.MonitoringConfig, error) {
	result := &everestv1alpha1.MonitoringConfig{}
	err := c.restClient.
		Get().
		Namespace(c.namespace).
		Resource(monitoringConfigAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Name(name).
		Do(ctx).
		Into(result)
	return result, err
}

// List retrieves a monitoring configs list based on opts.
func (c *monitoringConfigClient) List(
	ctx context.Context,
	opts metav1.ListOptions,
) (*everestv1alpha1.MonitoringConfigList, error) {
	result := &everestv1alpha1.MonitoringConfigList{}
	err := c.restClient.
		Get().
		Namespace(c.namespace).
		Resource(monitoringConfigAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).
		Into(result)
	return result, err
}
