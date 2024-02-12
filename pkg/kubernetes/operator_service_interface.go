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

package kubernetes

import (
	"context"

	"github.com/operator-framework/api/pkg/operators/v1alpha1"
)

// OperatorServiceManager ...
type OperatorServiceManager interface {
	// SetKubeConfig receives a new config and establish a new connection to the K8 cluster.
	SetKubeConfig(kubeConfig string) error
	// InstallOLMOperator installs the OLM in the Kubernetes cluster.
	InstallOLMOperator(ctx context.Context) error
	// InstallOperator installs an operator via OLM.
	InstallOperator(ctx context.Context, req InstallOperatorRequest) error
	// ListSubscriptions all the subscriptions in the namespace.
	ListSubscriptions(ctx context.Context, namespace string) (*v1alpha1.SubscriptionList, error)
	// UpgradeOperator upgrades an operator to the next available version.
	UpgradeOperator(ctx context.Context, namespace, name string) error
}
