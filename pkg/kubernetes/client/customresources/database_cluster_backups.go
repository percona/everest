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
//
//nolint:dupl
package customresources

import (
	"context"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
)

const (
	dbClusterBackupsAPIKind = "databaseclusterbackups"
)

// DBClusterBackups returns a db cluster backup.
func (c *Client) DBClusterBackups(namespace string) DBClusterBackupInterface { //nolint:ireturn
	return &dbClusterBackupClient{
		restClient: c.restClient,
		namespace:  namespace,
	}
}

type dbClusterBackupClient struct {
	restClient rest.Interface
	namespace  string
}

// DBClusterBackupInterface supports list, get and watch methods.
type DBClusterBackupInterface interface {
	List(ctx context.Context, opts metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error)
	Get(ctx context.Context, name string, options metav1.GetOptions) (*everestv1alpha1.DatabaseClusterBackup, error)
	Watch(ctx context.Context, opts metav1.ListOptions) (watch.Interface, error)
}

// List lists database cluster backups based on opts.
func (c *dbClusterBackupClient) List(ctx context.Context, opts metav1.ListOptions) (*everestv1alpha1.DatabaseClusterBackupList, error) {
	result := &everestv1alpha1.DatabaseClusterBackupList{}
	err := c.restClient.
		Get().
		Namespace(c.namespace).
		Resource(dbClusterBackupsAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Do(ctx).
		Into(result)
	return result, err
}

// Get retrieves database cluster backup based on opts.
func (c *dbClusterBackupClient) Get(
	ctx context.Context,
	name string,
	opts metav1.GetOptions,
) (*everestv1alpha1.DatabaseClusterBackup, error) {
	result := &everestv1alpha1.DatabaseClusterBackup{}
	err := c.restClient.
		Get().
		Namespace(c.namespace).
		Resource(dbClusterBackupsAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Name(name).
		Do(ctx).
		Into(result)
	return result, err
}

// Watch starts a watch based on opts.
func (c *dbClusterBackupClient) Watch( //nolint:ireturn
	ctx context.Context,
	opts metav1.ListOptions,
) (watch.Interface, error) {
	opts.Watch = true
	return c.restClient.
		Get().
		Namespace(c.namespace).
		Resource(dbClusterBackupsAPIKind).
		VersionedParams(&opts, scheme.ParameterCodec).
		Watch(ctx)
}
