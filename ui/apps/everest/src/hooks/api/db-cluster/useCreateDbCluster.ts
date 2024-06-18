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
import { DbWizardType } from 'pages/database-form/database-form-schema.ts';
import {
  ClusterCredentials,
  DataSource,
  DbCluster,
  GetDbClusterCredentialsPayload,
  ProxyExposeType,
} from 'shared-types/dbCluster.types';
import { PerconaQueryOptions } from 'shared-types/query.types';
import cronConverter from 'utils/cron-converter';

type CreateDbClusterArgType = {
  dbPayload: DbWizardType;
  backupDataSource?: DataSource;
};

const formValuesToPayloadMapping = (
  dbPayload: DbWizardType,
  backupDataSource?: DataSource
): DbCluster => {
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
        ...(dbPayload.schedules?.length > 0 && {
          schedules: dbPayload.schedules.map((schedule) => ({
            ...schedule,
            schedule: cronConverter(
              schedule.schedule,
              Intl.DateTimeFormat().resolvedOptions().timeZone,
              'UTC'
            ),
          })),
        }),
      },
      engine: {
        type: dbTypeToDbEngine(dbPayload.dbType),
        version: dbPayload.dbVersion,
        replicas: +dbPayload.numberOfNodes,
        resources: {
          cpu: `${dbPayload.cpu}`,
          memory: `${dbPayload.memory}G`,
        },
        storage: {
          class: dbPayload.storageClass!,
          size: `${dbPayload.disk}G`,
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
        replicas: +dbPayload.numberOfNodes,
        expose: {
          type: dbPayload.externalAccess
            ? ProxyExposeType.external
            : ProxyExposeType.internal,
          ...(!!dbPayload.externalAccess &&
            dbPayload.sourceRanges && {
              ipSourceRanges: dbPayload.sourceRanges.flatMap((source) =>
                source.sourceRange ? [source.sourceRange] : []
              ),
            }),
        },
      },
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
) =>
  useQuery<GetDbClusterCredentialsPayload, unknown, ClusterCredentials>({
    queryKey: [`cluster-credentials-${dbClusterName}`],
    queryFn: () => getDbClusterCredentialsFn(dbClusterName, namespace),
    ...options,
  });
