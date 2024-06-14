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
import { DbCluster, ProxyExposeType } from 'shared-types/dbCluster.types';
import { DbWizardType } from 'pages/database-form/database-form-schema.ts';
import cronConverter from 'utils/cron-converter';

type UpdateDbClusterArgType = {
  dbPayload: DbWizardType;
  dbCluster: DbCluster;
};

const formValuesToPayloadOverrides = (
  dbPayload: DbWizardType,
  dbCluster: DbCluster
): DbCluster => {
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
        enabled: dbPayload.schedules?.length > 0,
        pitr: {
          ...dbCluster?.spec?.backup?.pitr,
          enabled: dbPayload.pitrEnabled,
          backupStorageName: pitrBackupStorageName,
        },
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
        ...dbCluster.spec.engine,
        version: dbPayload.dbVersion,
        replicas: +dbPayload.numberOfNodes,
        resources: {
          ...dbCluster.spec.engine.resources,
          cpu: `${dbPayload.cpu}`,
          memory: `${dbPayload.memory}G`,
        },
        storage: {
          ...dbCluster.spec.engine.storage,
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
        ...dbCluster.spec.proxy,
        replicas: +dbPayload.numberOfNodes,
        expose: {
          ...dbCluster.spec.proxy.expose,
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
