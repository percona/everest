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
} from '@tanstack/react-query';
import {
  createBackupStorageFn,
  deleteBackupStorageFn,
  editBackupStorageFn,
  getBackupStoragesFn,
} from 'api/backupStorage';
import {
  BackupStorage,
  GetBackupStoragesPayload,
} from 'shared-types/backupStorages.types';
import { PerconaQueryOptions } from 'shared-types/query.types';
import { useNamespaces } from '../namespaces';

export const BACKUP_STORAGES_QUERY_KEY = 'backupStorages';

export type BackupStoragesForNamespaceResult =
  PerconaQueryOptions<GetBackupStoragesPayload>;

export const useBackupStorages = () => {
  const { data: namespaces = [] } = useNamespaces({
    refetchInterval: 5 * 1000,
  });
  const queries = namespaces.map((namespace) => {
    return {
      queryKey: [BACKUP_STORAGES_QUERY_KEY, namespace],
      queryFn: () => getBackupStoragesFn(namespace),
      refetchInterval: 5 * 1000,
    };
  });

  const queryResults = useQueries({
    queries,
  });

  return queryResults;
};

export const useBackupStoragesByNamespace = (
  namespace: string,
  options?: PerconaQueryOptions<
    GetBackupStoragesPayload,
    unknown,
    BackupStorage[]
  >
) => {
  return useQuery<GetBackupStoragesPayload, unknown, BackupStorage[]>({
    queryKey: [BACKUP_STORAGES_QUERY_KEY, namespace],
    queryFn: () => getBackupStoragesFn(namespace),
    ...options,
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
