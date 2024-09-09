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
  pageTitle: 'Resources',
  pageDescription:
    'Configure the resources your new database will have access to.',
  labels: {
    numberOfNodes: 'Number of nodes',
    resourceSizePerNode: 'Resource size per node',
    cpu: 'cpu',
    memory: 'memory',
    disk: 'disk',
    estimated: (value: string | number | undefined, units: string) =>
      value ? `Estimated available: ${value} ${units}` : '',
    shardsConfig: 'Shards configuration',
    numberOfShards: 'Number of shards',
    numberOfConfigServers: 'Number of configuration servers',
  },
  alerts: {
    resourcesCapacityExceeding: (
      fieldName: string,
      value: number | undefined,
      units: string
    ) =>
      `Your specified ${fieldName} size exceeds the ${
        value ? `${value} ${units}` : ''
      } available. Enter a smaller value before continuing.`,
  },
};
