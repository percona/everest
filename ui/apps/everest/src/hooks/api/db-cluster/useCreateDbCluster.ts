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

import { dbTypeToDbEngine } from '@percona/utils';
import {
  UseMutationOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import { createDbClusterFn, getDbClusterCredentialsFn } from 'api/dbClusterApi';
import { affinityRulesToDbPayload } from 'components/cluster-form/affinity/affinity-utils';
import {
  CUSTOM_NR_UNITS_INPUT_VALUE,
  MIN_NUMBER_OF_SHARDS,
} from 'components/cluster-form';
import { AffinityComponent, AffinityRule } from 'shared-types/affinity.types';
import { DbWizardType } from 'pages/database-form/database-form-schema.ts';
import {
  ClusterCredentials,
  DataSource,
  DbCluster,
  GetDbClusterCredentialsPayload,
} from 'shared-types/dbCluster.types';
import { PerconaQueryOptions } from 'shared-types/query.types';
import cronConverter from 'utils/cron-converter';
import { getProxySpec } from './utils';
import { DbType } from '@percona/types';
import { useRBACPermissions } from 'hooks/rbac';

type CreateDbClusterArgType = {
  dbPayload: DbWizardType;
  backupDataSource?: DataSource;
};

const formValuesToPayloadMapping = (
  dbPayload: DbWizardType,
  backupDataSource?: DataSource
): DbCluster => {
  const affinityRules = dbPayload.affinityRules || [];

  const proxy = affinityRules.filter(
    (rule: AffinityRule) => rule.component === AffinityComponent.Proxy
  );
  const dbNode = affinityRules.filter(
    (rule: AffinityRule) => rule.component === AffinityComponent.DbNode
  );
  const configServers = affinityRules.filter(
    (rule: AffinityRule) => rule.component === AffinityComponent.ConfigServer
  );
  const dbNodeRules = affinityRulesToDbPayload(dbNode);
  const proxyRules = affinityRulesToDbPayload(proxy);
  const configServerRules =
    configServers.length > 0 ? affinityRulesToDbPayload(configServers) : {};
  const numberOfNodes = parseInt(
    dbPayload.numberOfNodes === CUSTOM_NR_UNITS_INPUT_VALUE
      ? dbPayload.customNrOfNodes || ''
      : dbPayload.numberOfNodes,
    10
  );
  const dbClusterPayload: DbCluster = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: dbPayload.dbName,
      namespace: dbPayload.k8sNamespace || '',
    },
    spec: {
      backup: {
        enabled: dbPayload.schedules?.length > 0,
        ...(dbPayload.pitrEnabled && {
          pitr: {
            enabled: dbPayload.pitrEnabled,
            backupStorageName:
              typeof dbPayload.pitrStorageLocation === 'string'
                ? dbPayload.pitrStorageLocation
                : dbPayload.pitrStorageLocation!.name,
          },
        }),
        schedules:
          dbPayload.schedules?.length > 0
            ? dbPayload.schedules.map((schedule) => ({
                ...schedule,
                schedule: cronConverter(
                  schedule.schedule,
                  Intl.DateTimeFormat().resolvedOptions().timeZone,
                  'UTC'
                ),
              }))
            : undefined,
      },
      engine: {
        type: dbTypeToDbEngine(dbPayload.dbType),
        version: dbPayload.dbVersion,
        replicas: numberOfNodes,
        resources: {
          cpu: `${dbPayload.cpu}`,
          memory: `${dbPayload.memory}G`,
        },
        storage: {
          class: dbPayload.storageClass!,
          size: `${dbPayload.disk}${dbPayload.diskUnit}`,
        },
        config: dbPayload.engineParametersEnabled
          ? dbPayload.engineParameters
          : '',
        affinity: dbNodeRules,
      },
      monitoring: {
        ...(!!dbPayload.monitoring && {
          monitoringConfigName: dbPayload?.monitoringInstance!,
        }),
      },
      proxy: getProxySpec(
        dbPayload.dbType,
        dbPayload.numberOfProxies,
        dbPayload.customNrOfProxies || '',
        dbPayload.externalAccess,
        dbPayload.proxyCpu,
        dbPayload.proxyMemory,
        dbPayload.sharding,
        dbPayload.sourceRanges || [],
        proxyRules
      ),
      ...(dbPayload.dbType === DbType.Mongo && {
        sharding: {
          enabled: dbPayload.sharding,
          shards: +(dbPayload.shardNr ?? MIN_NUMBER_OF_SHARDS),
          configServer: {
            replicas: +(dbPayload.shardConfigServers ?? 3),
            affinity: configServerRules,
          },
        },
      }),
      ...(backupDataSource?.dbClusterBackupName && {
        dataSource: {
          dbClusterBackupName: backupDataSource.dbClusterBackupName,
          ...(backupDataSource?.pitr && {
            pitr: {
              date: backupDataSource.pitr.date,
              type: 'date',
            },
          }),
        },
      }),
    },
  };

  return dbClusterPayload;
};

export const useCreateDbCluster = (
  options?: UseMutationOptions<
    unknown,
    unknown,
    CreateDbClusterArgType,
    unknown
  >
) =>
  useMutation({
    mutationFn: ({ dbPayload, backupDataSource }: CreateDbClusterArgType) =>
      createDbClusterFn(
        formValuesToPayloadMapping(dbPayload, backupDataSource),
        dbPayload.k8sNamespace || ''
      ),
    ...options,
  });

export const useDbClusterCredentials = (
  dbClusterName: string,
  namespace: string,
  options?: PerconaQueryOptions<ClusterCredentials, unknown, ClusterCredentials>
) => {
  const { canRead: canReadCredentials } = useRBACPermissions(
    'database-cluster-credentials',
    `${namespace}/${dbClusterName}`
  );

  return useQuery<GetDbClusterCredentialsPayload, unknown, ClusterCredentials>({
    queryKey: ['cluster-credentials', dbClusterName],
    queryFn: () => getDbClusterCredentialsFn(dbClusterName, namespace),
    select: canReadCredentials
      ? (creds) => creds
      : () => ({ username: '', password: '' }),
    ...options,
    enabled: (options?.enabled ?? true) && canReadCredentials,
  });
};
