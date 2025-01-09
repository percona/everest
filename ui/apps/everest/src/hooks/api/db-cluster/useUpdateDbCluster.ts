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

import {
  MutateOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { updateDbClusterFn } from 'api/dbClusterApi';
import {
  DbCluster,
  ProxyExposeType,
  Proxy,
} from 'shared-types/dbCluster.types';
import { MIN_NUMBER_OF_SHARDS } from 'components/cluster-form';
import { getProxySpec } from './utils';
import { DbEngineType } from 'shared-types/dbEngines.types';
import { dbEngineToDbType } from '@percona/utils';
import cronConverter from 'utils/cron-converter';
import { enqueueSnackbar } from 'notistack';
import { AxiosError } from 'axios';
import { useRef } from 'react';
import { DB_CLUSTER_QUERY, useDbCluster } from './useDbCluster';

const UPDATE_RETRY_TIMEOUT_MS = 5000;
const UPDATE_RETRY_DELAY_MS = 200;

export const updateDbCluster = (
  clusterName: string,
  namespace: string,
  dbCluster: DbCluster
) => {
  return updateDbClusterFn(clusterName, namespace, {
    ...dbCluster,
    spec: {
      ...dbCluster?.spec,
      ...(dbCluster?.spec?.backup?.schedules && {
        backup: {
          ...dbCluster?.spec?.backup,
          schedules: dbCluster?.spec?.backup?.schedules.map((schedule) => ({
            ...schedule,
            schedule: cronConverter(
              schedule.schedule,
              Intl.DateTimeFormat().resolvedOptions().timeZone,
              'UTC'
            ),
          })),
        },
      }),
    },
  });
};

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
      updateDbCluster(clusterName, namespace, {
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
export const useUpdateDbClusterAdvancedConfiguration = () =>
  useMutation({
    mutationFn: ({
      clusterName,
      namespace,
      dbCluster,
      externalAccess,
      sourceRanges,
      engineParametersEnabled,
      engineParameters,
    }: {
      clusterName: string;
      namespace: string;
      dbCluster: DbCluster;
      externalAccess: boolean;
      sourceRanges: Array<{ sourceRange?: string }>;
      engineParametersEnabled: boolean;
      engineParameters: string | undefined;
    }) =>
      updateDbCluster(clusterName, namespace, {
        ...dbCluster,
        spec: {
          ...dbCluster.spec,
          engine: {
            ...dbCluster.spec.engine,
            config: engineParametersEnabled ? engineParameters : '',
          },
          proxy: {
            ...dbCluster.spec.proxy,
            expose: {
              type: externalAccess
                ? ProxyExposeType.external
                : ProxyExposeType.internal,
              ...(!!externalAccess &&
                sourceRanges && {
                  ipSourceRanges: sourceRanges.flatMap((source) =>
                    source.sourceRange ? [source.sourceRange] : []
                  ),
                }),
            },
          } as Proxy,
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
      updateDbCluster(clusterName, namespace, {
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
      updateDbCluster(clusterName, namespace, {
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
      updateDbCluster(dbCluster.metadata.name, dbCluster.metadata.namespace, {
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
            ),
            (dbCluster.spec.proxy as Proxy).affinity
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
      updateDbCluster(clusterName, namespace, {
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

export const useUpdateDbClusterPITR = () =>
  useMutation({
    mutationFn: ({
      clusterName,
      namespace,
      dbCluster,
      enabled,
      backupStorageName,
    }: {
      clusterName: string;
      namespace: string;
      dbCluster: DbCluster;
      enabled: boolean;
      backupStorageName: string | { name: string };
    }) =>
      updateDbCluster(clusterName, namespace, {
        ...dbCluster,
        spec: {
          ...dbCluster.spec,
          backup: {
            ...dbCluster.spec.backup!,
            pitr: enabled
              ? {
                  backupStorageName:
                    typeof backupStorageName === 'string'
                      ? backupStorageName
                      : backupStorageName!.name,
                  enabled: true,
                }
              : { enabled: false, backupStorageName: '' },
          },
        },
      }),
  });

// TODO apply this to all update mutations. Right now it's only used in one place, components -> affinity rules
export const useUpdateDbClusterWithConflictRetry = (
  oldDbClusterData: DbCluster,
  mutationOptions?: MutateOptions<
    DbCluster,
    AxiosError<unknown, unknown>,
    {
      clusterName: string;
      namespace: string;
      dbCluster: DbCluster;
    },
    unknown
  >
) => {
  const {
    onSuccess: ownOnSuccess = () => {},
    onError: ownOnError = () => {},
    ...restMutationOptions
  } = mutationOptions || {};
  const {
    name: dbClusterName,
    namespace,
    generation: dbClusterGeneration,
  } = oldDbClusterData.metadata;

  const queryClient = useQueryClient();
  const watchStartTime = useRef<number | null>(null);
  const clusterDataToBeSent = useRef<DbCluster | null>(null);
  const { refetch } = useDbCluster(dbClusterName, namespace, {
    enabled: false,
  });

  const mutationMethods = useMutation<
    DbCluster,
    AxiosError,
    {
      clusterName: string;
      namespace: string;
      dbCluster: DbCluster;
    },
    unknown
  >({
    mutationFn: ({
      clusterName,
      namespace,
      dbCluster,
    }: {
      clusterName: string;
      namespace: string;
      dbCluster: DbCluster;
    }) => {
      clusterDataToBeSent.current = dbCluster;
      return updateDbCluster(clusterName, namespace, dbCluster);
    },
    onError: async (error, vars, ctx) => {
      const { status } = error;

      if (status === 409) {
        if (watchStartTime.current === null) {
          watchStartTime.current = Date.now();
        }

        const timeDiff = Date.now() - watchStartTime.current;

        if (timeDiff > UPDATE_RETRY_TIMEOUT_MS) {
          enqueueSnackbar(
            'There is a conflict with the current object definition',
            {
              variant: 'error',
            }
          );
          ownOnError?.(error, vars, ctx);
          watchStartTime.current = null;
          return;
        }

        return new Promise<void>((resolve) =>
          setTimeout(async () => {
            const { data: freshDbCluster } = await refetch();

            if (freshDbCluster) {
              const { generation, resourceVersion } = freshDbCluster.metadata;

              if (generation === dbClusterGeneration) {
                resolve();
                mutationMethods.mutate({
                  clusterName: dbClusterName,
                  namespace,
                  dbCluster: {
                    ...clusterDataToBeSent.current!,
                    metadata: { ...freshDbCluster.metadata, resourceVersion },
                  },
                });
              } else {
                enqueueSnackbar('The object de', {
                  variant: 'error',
                });
                ownOnError?.(error, vars, ctx);
                watchStartTime.current = null;
                resolve();
              }
            } else {
              watchStartTime.current = null;
              ownOnError?.(error, vars, ctx);
              resolve();
            }
          }, UPDATE_RETRY_DELAY_MS)
        );
      }

      mutationOptions?.onError?.(error, vars, ctx);
      return;
    },
    onSuccess: (data, vars, ctx) => {
      watchStartTime.current = null;
      queryClient.setQueryData([DB_CLUSTER_QUERY, dbClusterName], data);
      ownOnSuccess?.(data, vars, ctx);
    },
    ...restMutationOptions,
  });

  return mutationMethods;
};
