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

export type AffinityRule = {
  component: string;
  type: string;
  priority: string;
  weight?: number;
  topologyKey?: string;
  key?: string;
  operator?: string;
  values?: string;
};

type AffinityComponentType = keyof typeof AffinityComponent;

export type AffinityRules = [
  { component: AffinityComponentType; rules: AffinityRule[] },
];

export enum AffinityComponent {
  DbNode = 'dbNode',
  Proxy = 'proxy',
  ConfigServer = 'configServer',
}

export enum AffinityType {
  NodeAffinity = 'nodeAffinity',
  PodAffinity = 'podAffinity',
  PodAntiAffinity = 'podAntiAffinity',
}

export enum AffinityPriority {
  Preferred = 'preferred',
  Required = 'required',
}

export enum AffinityOperator {
  In = 'in',
  NotIn = 'notIn',
  Exists = 'exists',
  DoesNotExist = 'doesNotExist',
}

export const AffinityComponentValue: Record<AffinityComponent, string> = {
  [AffinityComponent.DbNode]: 'DB Node',
  [AffinityComponent.Proxy]: 'Proxy',
  [AffinityComponent.ConfigServer]: 'Config Server',
};

export const AffinityTypeValue: Record<AffinityType, string> = {
  [AffinityType.NodeAffinity]: 'Node affinity',
  [AffinityType.PodAffinity]: 'Pod affinity',
  [AffinityType.PodAntiAffinity]: 'Pod anti-affinity',
};

export const AffinityOperatorValue: Record<AffinityOperator, string> = {
  [AffinityOperator.Exists]: 'exists',
  [AffinityOperator.DoesNotExist]: 'does not exist',
  [AffinityOperator.In]: 'in',
  [AffinityOperator.NotIn]: 'not in',
};

export const AffinityPriorityValue: Record<AffinityPriority, string> = {
  [AffinityPriority.Preferred]: 'Preferred',
  [AffinityPriority.Required]: 'Required',
};

export enum AdvancedConfigurationFields {
  externalAccess = 'externalAccess',
  sourceRanges = 'sourceRanges',
  engineParametersEnabled = 'engineParametersEnabled',
  engineParameters = 'engineParameters',
  affinityRules = 'affinityRules',
}
