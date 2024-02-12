// percona-everest-backend
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
package customresources

import (
	"sync"

	everestv1alpha1 "github.com/percona/everest-operator/api/v1alpha1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
)

//nolint:gochecknoglobals
var addToScheme sync.Once

// Client contains a rest client.
type Client struct {
	restClient rest.Interface
	restMapper meta.RESTMapper
}

// NewForConfig creates a new database cluster client based on config.
func NewForConfig(c *rest.Config, restMapper meta.RESTMapper) (*Client, error) {
	config := *c
	config.ContentConfig.GroupVersion = &everestv1alpha1.GroupVersion
	config.APIPath = "/apis"
	config.NegotiatedSerializer = scheme.Codecs.WithoutConversion()
	config.UserAgent = rest.DefaultKubernetesUserAgent()

	var err error
	addToScheme.Do(func() {
		err = everestv1alpha1.SchemeBuilder.AddToScheme(scheme.Scheme)
		metav1.AddToGroupVersion(scheme.Scheme, everestv1alpha1.GroupVersion)
	})

	if err != nil {
		return nil, err
	}

	client, err := rest.RESTClientFor(&config)
	if err != nil {
		return nil, err
	}

	return &Client{
		restClient: client,
		restMapper: restMapper,
	}, nil
}
