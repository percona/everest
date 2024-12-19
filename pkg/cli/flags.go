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

// Package cli contains the logic for the CLI commands.
package cli

const (
	// FlagKubeconfig is the name of the kubeconfig flag.
	FlagKubeconfig = "kubeconfig"
	// FlagVerbose is the name of the verbose flag.
	FlagVerbose = "verbose"
	// FlagOperatorPostgresql represents the pg operator flag.
	FlagOperatorPostgresql = "operator.postgresql"
	// FlagOperatorXtraDBCluster represents the pxc operator flag.
	FlagOperatorXtraDBCluster = "operator.xtradb-cluster"
	// FlagOperatorMongoDB represents the psmdb operator flag.
	FlagOperatorMongoDB = "operator.mongodb"
	// FlagNamespaces represents the namespaces flag.
	FlagNamespaces = "namespaces"
	// FlagVersionMetadataURL represents the version service url flag.
	FlagVersionMetadataURL = "version-metadata-url"
	// FlagVersion represents the version flag.
	FlagVersion = "version"
	// FlagSkipWizard represents the flag to skip the installation wizard.
	FlagSkipWizard = "skip-wizard"
	// FlagSkipEnvDetection is the name of the skip env detection flag.
	FlagSkipEnvDetection = "skip-env-detection"
	// FlagDisableTelemetry disables telemetry.
	FlagDisableTelemetry = "disable-telemetry"
	// FlagTakeNamespaceOwnership is the name of the take-ownership flag.
	FlagTakeNamespaceOwnership = "take-ownership"
	// FlagInstallSkipDBNamespace is the name of the skip-db-namespace flag.
	// TODO
	FlagInstallSkipDBNamespace = "skip-db-namespace"
)
