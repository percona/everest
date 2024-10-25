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
import { DbCluster } from 'shared-types/dbCluster.types';
import { DbWizardMode } from './database-form.types';
import { DbWizardFormFields } from 'consts.ts';
import { dbEngineToDbType } from '@percona/utils';

import { cpuParser, memoryParser } from 'utils/k8ResourceParser';
import { MAX_DB_CLUSTER_NAME_LENGTH } from 'consts';
import { DbWizardType } from './database-form-schema.ts';
import { DB_WIZARD_DEFAULTS } from './database-form.constants.ts';
import { generateShortUID } from 'utils/generateShortUID';
import {
  CUSTOM_NR_UNITS_INPUT_VALUE,
  getDefaultNumberOfconfigServersByNumberOfNodes,
  matchFieldsValueToResourceSize,
  NODES_DB_TYPE_MAP,
} from 'components/cluster-form';
import { advancedConfigurationModalDefaultValues } from 'components/cluster-form/advanced-configuration/advanced-configuration.utils.ts';
const replicasToNodes = (replicas: string, dbType: DbType): string => {
  const nodeOptions = NODES_DB_TYPE_MAP[dbType];
  const replicasString = replicas.toString();

  if (nodeOptions.includes(replicasString)) {
    return replicasString;
  }

  return CUSTOM_NR_UNITS_INPUT_VALUE;
};

export const DbClusterPayloadToFormValues = (
  dbCluster: DbCluster,
  mode: DbWizardMode,
  namespace: string
): DbWizardType => {
  const backup = dbCluster?.spec?.backup;
  const replicas = dbCluster?.spec?.engine?.replicas.toString();
  const proxies = (dbCluster?.spec?.proxy?.replicas || 0).toString();
  const diskValues = memoryParser(
    dbCluster?.spec?.engine?.storage?.size.toString()
  );

  const sharding = dbCluster?.spec?.sharding;
  const numberOfNodes = replicasToNodes(
    replicas,
    dbEngineToDbType(dbCluster?.spec?.engine?.type)
  );

  return {
    //basic info
    [DbWizardFormFields.k8sNamespace]:
      namespace || DB_WIZARD_DEFAULTS[DbWizardFormFields.k8sNamespace],
    [DbWizardFormFields.dbType]: dbEngineToDbType(
      dbCluster?.spec?.engine?.type
    ),
    [DbWizardFormFields.dbName]:
      mode === 'restoreFromBackup'
        ? `restored-${dbCluster?.metadata?.name}-${generateShortUID()}`.slice(
            0,
            MAX_DB_CLUSTER_NAME_LENGTH
          )
        : dbCluster?.metadata?.name,
    [DbWizardFormFields.dbVersion]: dbCluster?.spec?.engine?.version || '',

    //resources
    [DbWizardFormFields.numberOfNodes]: numberOfNodes,
    [DbWizardFormFields.numberOfProxies]: replicasToNodes(
      proxies,
      dbEngineToDbType(dbCluster?.spec?.engine?.type)
    ),
    [DbWizardFormFields.customNrOfNodes]: replicas,
    [DbWizardFormFields.customNrOfProxies]: proxies,
    [DbWizardFormFields.resourceSizePerNode]: matchFieldsValueToResourceSize(
      dbEngineToDbType(dbCluster?.spec?.engine?.type),
      dbCluster?.spec?.engine?.resources
    ),
    [DbWizardFormFields.resourceSizePerProxy]: matchFieldsValueToResourceSize(
      dbEngineToDbType(dbCluster?.spec?.engine?.type),
      dbCluster?.spec?.proxy.resources
    ),
    [DbWizardFormFields.sharding]: dbCluster?.spec?.sharding?.enabled || false,
    [DbWizardFormFields.shardConfigServers]: (
      sharding?.configServer?.replicas ||
      getDefaultNumberOfconfigServersByNumberOfNodes(+numberOfNodes)
    ).toString(),
    [DbWizardFormFields.shardNr]: (
      sharding?.shards ||
      (DB_WIZARD_DEFAULTS[DbWizardFormFields.shardNr] as string)
    ).toString(),
    [DbWizardFormFields.cpu]: cpuParser(
      dbCluster?.spec?.engine?.resources?.cpu.toString() || '0'
    ),
    [DbWizardFormFields.proxyCpu]: cpuParser(
      dbCluster?.spec?.proxy?.resources?.cpu.toString() || '0'
    ),
    [DbWizardFormFields.disk]: diskValues.value,
    [DbWizardFormFields.diskUnit]: diskValues.originalUnit,
    [DbWizardFormFields.memory]: memoryParser(
      (dbCluster?.spec?.engine?.resources?.memory || 0).toString(),
      'G'
    ).value,
    [DbWizardFormFields.proxyMemory]: memoryParser(
      (dbCluster?.spec?.proxy?.resources?.memory || 0).toString(),
      'G'
    ).value,
    [DbWizardFormFields.storageClass]:
      dbCluster?.spec?.engine?.storage?.class || null,

    //backups
    [DbWizardFormFields.backupsEnabled]: !!backup?.enabled,
    [DbWizardFormFields.pitrEnabled]: backup?.pitr?.enabled || false,
    [DbWizardFormFields.pitrStorageLocation]:
      (backup?.pitr?.enabled && mode === 'new') || mode === 'edit'
        ? backup?.pitr?.backupStorageName || null
        : DB_WIZARD_DEFAULTS[DbWizardFormFields.pitrStorageLocation],
    [DbWizardFormFields.schedules]: backup?.schedules || [],

    //advanced configuration
    ...advancedConfigurationModalDefaultValues(dbCluster),

    //monitoring
    [DbWizardFormFields.monitoring]:
      !!dbCluster?.spec?.monitoring?.monitoringConfigName,
    [DbWizardFormFields.monitoringInstance]:
      dbCluster?.spec?.monitoring?.monitoringConfigName || '',
  };
};
