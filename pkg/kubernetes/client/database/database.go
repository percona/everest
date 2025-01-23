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

// Package database TODO
package database

import (
	"context"
	"sync"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/rest"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
)

const (
	// DBClusterKind defines kind for DB cluster.
	DBClusterKind = "DatabaseCluster"
	apiKind       = "databaseclusters"
)

// DBClusterClientInterface supports getting a database cluster client.
type DBClusterClientInterface interface {
	DBClusters(namespace string) DBClusterInterface
}

// DBClusterClient contains a rest client.
type DBClusterClient struct {
	restClient rest.Interface
}

//nolint:gochecknoglobals
var addToScheme sync.Once

// DBClusterInterface supports list, get and watch methods.
type DBClusterInterface interface {
	List(ctx context.Context, opts metav1.ListOptions) (*everestv1alpha1.DatabaseClusterList, error)
	Get(ctx context.Context, name string, options metav1.GetOptions) (*everestv1alpha1.DatabaseCluster, error)
	Watch(ctx context.Context, opts metav1.ListOptions) (watch.Interface, error)
}

type dbClusterClient struct {
	restClient rest.Interface
	namespace  string
}
