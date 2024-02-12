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

// Package kubernetes provides functionality for kubernetes.
package kubernetes

import (
	"context"
	"errors"
	"strings"

	"go.uber.org/zap"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/client-go/rest"

	"github.com/percona/everest/pkg/kubernetes/client"
)

type (
	// ClusterType defines type of cluster.
	ClusterType string
)

const (
	// ClusterTypeUnknown is for unknown type.
	ClusterTypeUnknown ClusterType = "unknown"
	// ClusterTypeMinikube is for minikube.
	ClusterTypeMinikube ClusterType = "minikube"
	// ClusterTypeEKS is for EKS.
	ClusterTypeEKS ClusterType = "eks"
	// ClusterTypeGeneric is a generic type.
	ClusterTypeGeneric ClusterType = "generic"

	// EverestOperatorDeploymentName is the name of the deployment for everest operator.
	EverestOperatorDeploymentName = "everest-operator-controller-manager"

	// EverestDBNamespacesEnvVar is the name of the environment variable that
	// contains the list of monitored namespaces.
	EverestDBNamespacesEnvVar = "DB_NAMESPACES"
)

// Kubernetes is a client for Kubernetes.
type Kubernetes struct {
	client    client.KubeClientConnector
	l         *zap.SugaredLogger
	namespace string
}

// NewInCluster creates a new kubernetes client using incluster authentication.
func NewInCluster(l *zap.SugaredLogger) (*Kubernetes, error) {
	client, err := client.NewInCluster()
	if err != nil {
		return nil, err
	}
	return &Kubernetes{
		client:    client,
		l:         l,
		namespace: client.Namespace(),
	}, nil
}

// Config returns rest config.
func (k *Kubernetes) Config() *rest.Config {
	return k.client.Config()
}

// Namespace returns the current namespace.
func (k *Kubernetes) Namespace() string {
	return k.namespace
}

// ClusterName returns the name of the k8s cluster.
func (k *Kubernetes) ClusterName() string {
	return k.client.ClusterName()
}

// GetEverestID returns the ID of the namespace where everest is deployed.
func (k *Kubernetes) GetEverestID(ctx context.Context) (string, error) {
	namespace, err := k.client.GetNamespace(ctx, k.namespace)
	if err != nil {
		return "", err
	}
	return string(namespace.UID), nil
}

// GetClusterType tries to guess the underlying kubernetes cluster based on storage class.
func (k *Kubernetes) GetClusterType(ctx context.Context) (ClusterType, error) {
	storageClasses, err := k.client.GetStorageClasses(ctx)
	if err != nil {
		return ClusterTypeUnknown, err
	}
	for _, storageClass := range storageClasses.Items {
		if strings.Contains(storageClass.Provisioner, "aws") {
			return ClusterTypeEKS, nil
		}
		if strings.Contains(storageClass.Provisioner, "minikube") ||
			strings.Contains(storageClass.Provisioner, "kubevirt.io/hostpath-provisioner") ||
			strings.Contains(storageClass.Provisioner, "standard") {
			return ClusterTypeMinikube, nil
		}
	}
	return ClusterTypeGeneric, nil
}

// GetDBNamespaces returns a list of namespaces that are monitored by the Everest operator.
func (k *Kubernetes) GetDBNamespaces(ctx context.Context, namespace string) ([]string, error) {
	deployment, err := k.GetDeployment(ctx, EverestOperatorDeploymentName, namespace)
	if err != nil {
		return nil, err
	}

	for _, container := range deployment.Spec.Template.Spec.Containers {
		if container.Name != "manager" {
			continue
		}
		for _, envVar := range container.Env {
			if envVar.Name != EverestDBNamespacesEnvVar {
				continue
			}
			return strings.Split(envVar.Value, ","), nil
		}
	}

	return nil, errors.New("failed to get watched namespaces")
}

// GetDeployment returns k8s deployment by provided name and namespace.
func (k *Kubernetes) GetDeployment(ctx context.Context, name, namespace string) (*appsv1.Deployment, error) {
	return k.client.GetDeployment(ctx, name, namespace)
}
