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

import { DbType } from '@percona/types';
import { DbWizardFormFields } from 'consts.ts';
import { DbWizardType } from './database-form-schema.ts';
import {
  getDefaultNumberOfconfigServersByNumberOfNodes,
  NODES_DEFAULT_SIZES,
  PROXIES_DEFAULT_SIZES,
  ResourceSize,
} from 'components/cluster-form/resources/constants.ts';
import {
  AffinityComponent,
  AffinityType,
  AffinityPriority,
} from 'components/cluster-form/advanced-configuration/advanced-configuration.types.ts';

export const DEFAULT_NODES: Record<DbType, string> = {
  [DbType.Mongo]: '3',
  [DbType.Mysql]: '3',
  [DbType.Postresql]: '2',
};

export const DB_WIZARD_DEFAULTS: DbWizardType = {
  // TODO should be changed to true after  https://jira.percona.com/browse/EVEREST-509
  [DbWizardFormFields.schedules]: [],
  [DbWizardFormFields.pitrEnabled]: false,
  [DbWizardFormFields.pitrStorageLocation]: null,
  // @ts-ignore
  [DbWizardFormFields.storageLocation]: null,
  [DbWizardFormFields.dbType]: '' as DbType,
  [DbWizardFormFields.dbName]: '',
  [DbWizardFormFields.dbVersion]: '',
  [DbWizardFormFields.storageClass]: '',
  [DbWizardFormFields.k8sNamespace]: null,
  [DbWizardFormFields.externalAccess]: false,
  [DbWizardFormFields.sourceRanges]: [{ sourceRange: '' }],
  [DbWizardFormFields.engineParametersEnabled]: false,
  [DbWizardFormFields.engineParameters]: '',
  [DbWizardFormFields.monitoring]: false,
  [DbWizardFormFields.monitoringInstance]: '',
  [DbWizardFormFields.numberOfNodes]: '1',
  [DbWizardFormFields.numberOfProxies]: '1',
  [DbWizardFormFields.resourceSizePerNode]: ResourceSize.small,
  [DbWizardFormFields.resourceSizePerProxy]: ResourceSize.small,
  [DbWizardFormFields.customNrOfNodes]: '1',
  [DbWizardFormFields.customNrOfProxies]: '1',
  [DbWizardFormFields.cpu]: NODES_DEFAULT_SIZES.mongodb.small.cpu,
  [DbWizardFormFields.proxyCpu]: PROXIES_DEFAULT_SIZES.mongodb.small.cpu,
  [DbWizardFormFields.disk]: NODES_DEFAULT_SIZES.mongodb.small.disk,
  [DbWizardFormFields.diskUnit]: 'Gi',
  [DbWizardFormFields.memory]: NODES_DEFAULT_SIZES.mongodb.small.memory,
  [DbWizardFormFields.proxyMemory]: PROXIES_DEFAULT_SIZES.mongodb.small.memory,
  [DbWizardFormFields.sharding]: false,
  [DbWizardFormFields.shardNr]: '2',
  [DbWizardFormFields.shardConfigServers]:
    getDefaultNumberOfconfigServersByNumberOfNodes(
      parseInt(DEFAULT_NODES[DbType.Mongo], 10)
    ),
  [DbWizardFormFields.affinityRules]: [
    {
      component: AffinityComponent.DbNode,
      type: AffinityType.PodAntiAffinity,
      priority: AffinityPriority.Preferred,
      weight: 1,
      topologyKey: 'kubernetes.io/hostname',
    },

    {
      component: AffinityComponent.Proxy,
      type: AffinityType.PodAntiAffinity,
      priority: AffinityPriority.Preferred,
      weight: 1,
      topologyKey: 'kubernetes.io/hostname',
    },
    {
      component: AffinityComponent.ConfigServer,
      type: AffinityType.PodAntiAffinity,
      priority: AffinityPriority.Preferred,
      weight: 1,
      topologyKey: 'kubernetes.io/hostname',
      key: 'abc',
    },
  ],
};
