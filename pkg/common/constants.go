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

// Package common holds common constants used across Everest.
package common

const (
	// PXCOperatorName holds operator name in k8s.
	PXCOperatorName = "percona-xtradb-cluster-operator"
	// PSMDBOperatorName holds operator name in k8s.
	PSMDBOperatorName = "percona-server-mongodb-operator"
	// PGOperatorName holds operator name in k8s.
	PGOperatorName = "percona-postgresql-operator"

	// SystemNamespace is the namespace where everest is installed.
	SystemNamespace = "everest-system"
	// PerconaEverestDeploymentName stores the name of everest API Server deployment.
	PerconaEverestDeploymentName = "percona-everest"
	// PerconaEverestOperatorDeploymentName stores the name of everest operator deployment.
	PerconaEverestOperatorDeploymentName = "everest-operator-controller-manager"
	// EverestContainerNameInDeployment is the name of the Everest container in the deployment.
	EverestContainerNameInDeployment = "everest"

	// EverestOperatorName holds the name for Everest operator.
	EverestOperatorName = "everest-operator"
)
