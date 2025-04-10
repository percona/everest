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
export const Messages = {
  pageTitle: 'Basic information',
  pageDescription: 'Provide the basic information for your new database.',
  labels: {
    dbType: 'Database type',
    dbName: 'Display name',
    k8sNamespace: 'Namespace',
    dbEnvironment: 'Database environment',
    dbVersion: 'Database version',
    shardedCluster: 'Sharded Cluster',
  },
  placeholders: {
    dbName: 'E.g. postgresql-123',
  },
  disableShardingTooltip:
    'Sharding cannot be enabled unless the PSMDB operator version is 1.17.0 or higher',
  noEnginesAvailable: 'No engines available for any namespace',
};
