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

import { UseMutationOptions, useMutation } from '@tanstack/react-query';
import { updateDbClusterFn } from 'api/dbClusterApi';
import { DbCluster, Proxy } from 'shared-types/dbCluster.types';
import { DbWizardType } from 'pages/database-form/database-form-schema.ts';
import cronConverter from 'utils/cron-converter';
import {
  CUSTOM_NR_UNITS_INPUT_VALUE,
  MIN_NUMBER_OF_SHARDS,
} from 'components/cluster-form';
import { getProxySpec } from './utils';
import { DbType } from '@percona/types';
import { DbEngineType } from 'shared-types/dbEngines.types';
import { dbEngineToDbType } from '@percona/utils';

type UpdateDbClusterArgType = {
  dbPayload: DbWizardType;
  dbCluster: DbCluster;
};

const formValuesToPayloadOverrides = (
  dbPayload: DbWizardType,
  dbCluster: DbCluster
): DbCluster => {
  const numberOfNodes = parseInt(
    dbPayload.numberOfNodes === CUSTOM_NR_UNITS_INPUT_VALUE
      ? dbPayload.customNrOfNodes || ''
      : dbPayload.numberOfNodes,
    10
  );
  let pitrBackupStorageName = '';

  if (dbPayload.pitrEnabled) {
    pitrBackupStorageName =
      typeof dbPayload.pitrStorageLocation === 'string'
        ? dbPayload.pitrStorageLocation
        : dbPayload.pitrStorageLocation!.name;
  }

  return {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: dbCluster.metadata,
    spec: {
      ...dbCluster?.spec,
      backup: {
        ...dbCluster?.spec?.backup,
        pitr: {
          ...dbCluster?.spec?.backup?.pitr,
          enabled: dbPayload.pitrEnabled,
          backupStorageName: pitrBackupStorageName,
        },
        schedules:
          dbPayload.schedules.length > 0
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
        ...dbCluster.spec.engine,
        version: dbPayload.dbVersion,
        replicas: numberOfNodes,
        resources: {
          ...dbCluster.spec.engine.resources,
          cpu: `${dbPayload.cpu}`,
          memory: `${dbPayload.memory}G`,
        },
        storage: {
          ...dbCluster.spec.engine.storage,
          class: dbPayload.storageClass!,
          size: `${dbPayload.disk}${dbPayload.diskUnit}`,
        },
        config: dbPayload.engineParametersEnabled
          ? dbPayload.engineParameters
          : '',
      },
      monitoring: {
        ...(!!dbPayload.monitoring && {
          monitoringConfigName: dbPayload?.monitoringInstance!,
        }),
      },
      proxy: {
        ...dbCluster.spec.proxy,
        ...getProxySpec(
          dbPayload.dbType,
          dbPayload.numberOfProxies,
          dbPayload.customNrOfProxies || '',
          dbPayload.externalAccess,
          dbPayload.proxyCpu,
          dbPayload.proxyMemory,
          dbPayload.sharding,
          dbPayload.sourceRanges || []
        ),
      },
      ...(dbPayload.dbType === DbType.Mongo && {
        sharding: {
          enabled: dbPayload.sharding,
          shards: +(dbPayload.shardNr ?? 1),
          configServer: {
            replicas: +(dbPayload.shardConfigServers ?? 3),
          },
        },
      }),
    },
  };
};

export const useUpdateDbCluster = (
  options?: UseMutationOptions<
    unknown,
    unknown,
    UpdateDbClusterArgType,
    unknown
  >
) =>
  useMutation({
    mutationFn: ({ dbPayload, dbCluster }: UpdateDbClusterArgType) => {
      const dbClusterName = dbCluster?.metadata?.name;
      const payload = formValuesToPayloadOverrides(dbPayload, dbCluster);
      return updateDbClusterFn(
        dbClusterName,
        dbPayload.k8sNamespace || '',
        payload
      );
    },
    ...options,
  });

export const useUpdateDbClusterCrd = () =>
  useMutation({
    mutationFn: ({
      clusterName,
      namespace,
      dbCluster,
      newCrdVersion,
    }: {
      clusterName: string;
      namespace: string;
      dbCluster: DbCluster;
      newCrdVersion: string;
    }) =>
      updateDbClusterFn(clusterName, namespace, {
        ...dbCluster,
        spec: {
          ...dbCluster.spec,
          engine: {
            ...dbCluster.spec.engine,
            crVersion: newCrdVersion,
          },
        },
      }),
  });

export const useUpdateDbClusterVersion = () =>
  useMutation({
    mutationFn: ({
      clusterName,
      namespace,
      dbCluster,
      dbVersion,
    }: {
      clusterName: string;
      namespace: string;
      dbCluster: DbCluster;
      dbVersion: string;
    }) =>
      updateDbClusterFn(clusterName, namespace, {
        ...dbCluster,
        spec: {
          ...dbCluster.spec,
          engine: {
            ...dbCluster.spec.engine,
            version: dbVersion,
          },
        },
      }),
  });

export const useUpdateDbClusterMonitoring = () =>
  useMutation({
    mutationFn: ({
      clusterName,
      namespace,
      dbCluster,
      monitoringName,
    }: {
      clusterName: string;
      namespace: string;
      dbCluster: DbCluster;
      monitoringName?: string;
    }) =>
      updateDbClusterFn(clusterName, namespace, {
        ...dbCluster,
        spec: {
          ...dbCluster.spec,
          monitoring: monitoringName
            ? {
                monitoringConfigName: monitoringName,
              }
            : {},
        },
      }),
  });

export const useUpdateDbClusterResources = () =>
  useMutation({
    mutationFn: ({
      dbCluster,
      newResources,
      sharding,
      shardConfigServers,
      shardNr,
    }: {
      dbCluster: DbCluster;
      newResources: {
        cpu: number;
        memory: number;
        disk: number;
        diskUnit: string;
        numberOfNodes: number;
        proxyCpu: number;
        proxyMemory: number;
        numberOfProxies: number;
      };
      sharding?: boolean;
      shardConfigServers?: string;
      shardNr?: string;
    }) =>
      updateDbClusterFn(dbCluster.metadata.name, dbCluster.metadata.namespace, {
        ...dbCluster,
        spec: {
          ...dbCluster.spec,
          engine: {
            ...dbCluster.spec.engine,
            replicas: newResources.numberOfNodes,
            resources: {
              cpu: `${newResources.cpu}`,
              memory: `${newResources.memory}G`,
            },
            storage: {
              ...dbCluster.spec.engine.storage,
              size: `${newResources.disk}${newResources.diskUnit}`,
            },
          },
          proxy: getProxySpec(
            dbEngineToDbType(dbCluster.spec.engine.type),
            newResources.numberOfProxies.toString(),
            '',
            (dbCluster.spec.proxy as Proxy).expose.type === 'external',
            newResources.proxyCpu,
            newResources.proxyMemory,
            !!sharding,
            ((dbCluster.spec.proxy as Proxy).expose.ipSourceRanges || []).map(
              (sourceRange) => ({ sourceRange })
            )
          ),
          ...(dbCluster.spec.engine.type === DbEngineType.PSMDB &&
            sharding && {
              sharding: {
                enabled: sharding,
                shards: +(shardNr ?? MIN_NUMBER_OF_SHARDS),
                configServer: {
                  replicas: +(shardConfigServers ?? 3),
                },
              },
            }),
        },
      }),
  });

export const useUpdateDbClusterEngine = () =>
  useMutation({
    mutationFn: ({
      clusterName,
      namespace,
      dbCluster,
      newEngineVersion,
    }: {
      clusterName: string;
      namespace: string;
      dbCluster: DbCluster;
      newEngineVersion: string;
    }) =>
      updateDbClusterFn(clusterName, namespace, {
        ...dbCluster,
        spec: {
          ...dbCluster.spec,
          engine: {
            ...dbCluster.spec.engine,
            version: newEngineVersion,
          },
        },
      }),
  });
