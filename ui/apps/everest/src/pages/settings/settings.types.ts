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
export enum SettingsTabs {
  // defaultConfigurations = 'default-configurations',
  storageLocations = 'storage-locations',
  monitoringEndpoints = 'monitoring-endpoints',
  namespaces = 'namespaces',
  // k8sClusters = 'k8s-clusters',
}

export const settingsTabsMui: Record<SettingsTabs, number> = {
  // [SettingsTabs.defaultConfigurations]: 0,
  [SettingsTabs.storageLocations]: 1,
  [SettingsTabs.monitoringEndpoints]: 2,
  [SettingsTabs.namespaces]: 3,
  // [SettingsTabs.k8sClusters]: 3,
};
