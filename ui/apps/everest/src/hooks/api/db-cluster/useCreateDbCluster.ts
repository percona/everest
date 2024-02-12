// percona-everest-frontend
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
import { createDbClusterFn, getDbClusterCredentialsFn } from 'api/dbClusterApi';
import { getCronExpressionFromFormValues } from 'components/time-selection/time-selection.utils.ts';
import { DbWizardType } from 'pages/database-form/database-form-schema.ts';
import { generateShortUID } from 'pages/database-form/steps/first/utils.ts';
import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from 'react-query';
import {
  ClusterCredentials,
  DataSource,
  DbCluster,
  GetDbClusterCredentialsPayload,
  ProxyExposeType,
} from 'shared-types/dbCluster.types';

type CreateDbClusterArgType = {
  dbPayload: DbWizardType;
  backupDataSource?: DataSource;
};

const formValuesToPayloadMapping = (
  dbPayload: DbWizardType,
  backupDataSource?: DataSource
): DbCluster => {
  const { selectedTime, minute, hour, amPm, onDay, weekDay } = dbPayload;
  const backupSchedule = getCronExpressionFromFormValues({
    selectedTime,
    minute,
    hour,
    amPm,
    onDay,
    weekDay,
  });

  // TODO re-add payload after API is ready
  const dbClusterPayload: DbCluster = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: dbPayload.dbName,
      namespace: dbPayload.k8sNamespace || '',
    },
    spec: {
      backup: {
        enabled: dbPayload.backupsEnabled,
        ...(dbPayload.pitrEnabled && {
          pitr: {
            enabled: dbPayload.pitrEnabled,
            backupStorageName:
              typeof dbPayload.pitrStorageLocation === 'string'
                ? dbPayload.pitrStorageLocation
                : dbPayload.pitrStorageLocation!.name,
          },
        }),
        ...(dbPayload.backupsEnabled && {
          schedules: [
            {
              enabled: true,
              name: dbPayload?.scheduleName || `backup-${generateShortUID()}`,
              backupStorageName:
                typeof dbPayload.storageLocation === 'string'
                  ? dbPayload.storageLocation
                  : dbPayload.storageLocation!.name,
              schedule: backupSchedule,
            },
          ],
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
) => {
  return useMutation(
    ({ dbPayload, backupDataSource }: CreateDbClusterArgType) =>
      createDbClusterFn(
        formValuesToPayloadMapping(dbPayload, backupDataSource),
        dbPayload.k8sNamespace || ''
      ),
    { ...options }
  );
};

export const useDbClusterCredentials = (
  dbClusterName: string,
  namespace: string,
  options?: UseQueryOptions<ClusterCredentials>
) => {
  return useQuery<GetDbClusterCredentialsPayload, unknown, ClusterCredentials>(
    `cluster-credentials-${dbClusterName}`,
    () => getDbClusterCredentialsFn(dbClusterName, namespace),
    { ...options }
  );
};
