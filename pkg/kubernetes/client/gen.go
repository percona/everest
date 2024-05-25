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

package client

//go:generate ../../../bin/ifacemaker -f backup_storage.go -f configmap.go -f client.go -f ctl.go -f database_cluster.go -f database_cluster_backup.go -f database_cluster_restore.go -f database_engine.go -f deployment.go -f install_plan.go -f monitoring.go -f monitoring_config.go -f namespace.go -f olm.go -f node.go -f pod.go -f secret.go -f storage.go -f writer -s Client -i KubeClientConnector -p client -o kubeclient_interface.go
//go:generate ../../../bin/mockery --name=KubeClientConnector --case=snake --inpackage
