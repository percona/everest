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
  useMutation,
  UseMutationOptions,
  useQueries,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import {
  createBackupStorageFn,
  deleteBackupStorageFn,
  editBackupStorageFn,
  getBackupStoragesFn,
} from 'api/backupStorage';
import {
  useNamespacePermissionsForResource,
  useRBACPermissions,
} from 'hooks/rbac';
import {
  BackupStorage,
  GetBackupStoragesPayload,
} from 'shared-types/backupStorages.types';
import { PerconaQueryOptions } from 'shared-types/query.types';

export const BACKUP_STORAGES_QUERY_KEY = 'backupStorages';

export interface BackupStoragesForNamespaceResult {
  namespace: string;
  queryResult: UseQueryResult<BackupStorage[], unknown>;
}

export const useBackupStorages = (
  queriesParams: Array<{
    namespace: string;
    options?: PerconaQueryOptions<
      GetBackupStoragesPayload,
      unknown,
      BackupStorage[]
    >;
  }>
) => {
  const { canRead } = useNamespacePermissionsForResource('backup-storages');
  const queries = queriesParams.map<
    UseQueryOptions<GetBackupStoragesPayload, unknown, BackupStorage[]>
  >(({ namespace, options }) => {
    const allowed = canRead.includes(namespace);
    return {
      queryKey: [BACKUP_STORAGES_QUERY_KEY, namespace],
      retry: false,
      queryFn: () => getBackupStoragesFn(namespace),
      refetchInterval: 5 * 1000,
      select: allowed ? undefined : () => [],
      ...options,
      enabled: (options?.enabled ?? true) && allowed,
    };
  });

  const queryResults = useQueries({ queries });

  const results: BackupStoragesForNamespaceResult[] = queryResults.map(
    (item, i) => ({
      namespace: queriesParams[i].namespace,
      queryResult: item,
    })
  );

  return results;
};

export const useBackupStoragesByNamespace = (
  namespace: string,
  options?: PerconaQueryOptions<
    GetBackupStoragesPayload,
    unknown,
    BackupStorage[]
  >
) => {
  const { canRead } = useRBACPermissions('backup-storages', `${namespace}/*`);

  return useQuery<GetBackupStoragesPayload, unknown, BackupStorage[]>({
    queryKey: [BACKUP_STORAGES_QUERY_KEY, namespace],
    queryFn: () => getBackupStoragesFn(namespace),
    ...options,
    enabled: (options?.enabled ?? true) && canRead,
  });
};

export const useCreateBackupStorage = (
  options?: UseMutationOptions<unknown, unknown, BackupStorage, unknown>
) =>
  useMutation({
    mutationFn: createBackupStorageFn,
    ...options,
  });

export const useEditBackupStorage = (
  options?: UseMutationOptions<unknown, unknown, BackupStorage, unknown>
) =>
  useMutation({
    mutationFn: editBackupStorageFn,
    ...options,
  });

type DeleteBackupStorageArgType = {
  backupStorageId: string;
  namespace: string;
};

export const useDeleteBackupStorage = (
  options?: UseMutationOptions<
    unknown,
    unknown,
    DeleteBackupStorageArgType,
    unknown
  >
) =>
  useMutation({
    mutationFn: ({ backupStorageId, namespace }: DeleteBackupStorageArgType) =>
      deleteBackupStorageFn(backupStorageId, namespace),
    ...options,
  });
