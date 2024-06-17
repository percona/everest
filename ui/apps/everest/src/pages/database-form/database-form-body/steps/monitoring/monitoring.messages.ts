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
  monitoring: 'Monitoring',
  caption:
    'Monitor the health of your database to detect issues quickly and improve its performance.',
  monitoringEnabled: 'Enable monitoring',
  monitoringInstanceLabel: 'Monitoring endpoint',
  alertText: (namespace: string) =>
    `Database monitoring is currently disabled because no monitoring endpoints have been configured. To enable database monitoring, first add a monitoring endpoint for the ${namespace} namespace`,
  command: 'everestctl monitoring enable',
  addMonitoringEndpoint: 'Add monitoring endpoint',
};
