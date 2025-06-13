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
import { useClusters } from '../clusters/useClusters';
import { Cluster } from 'api/clusters';

export const BACKUP_STORAGES_QUERY_KEY = 'backupStorages';

export type DeleteBackupStorageArgType = {
  backupStorageId: string;
  namespace: string;
  cluster: string;
};

export const useBackupStorages = () => {
  const { data: clusters = [], isLoading: clustersLoading } = useClusters();
  const { data: namespaces = [], isLoading: namespacesLoading } = useNamespaces({
    refetchInterval: 5 * 1000,
  });

  const queries = clusters.flatMap((cluster: Cluster) =>
    namespaces.map((namespace) => ({
      queryKey: [BACKUP_STORAGES_QUERY_KEY, cluster.name, namespace],
      queryFn: () => getBackupStoragesFn(cluster.name, namespace),
      refetchInterval: 5 * 1000,
    }))
  );

  const queryResults = useQueries({
    queries,
  });

  return {
    results: queryResults.map((result, index) => ({
      cluster: clusters[Math.floor(index / namespaces.length)].name,
      namespace: namespaces[index % namespaces.length],
      queryResult: result,
    })),
    isLoading: clustersLoading || namespacesLoading,
  };
};

export const useBackupStoragesByNamespace = (
  namespace: string,
  cluster: string = 'in-cluster',
  options?: PerconaQueryOptions<GetBackupStoragesPayload, unknown, BackupStorage[]>
) => {
  return useQuery<GetBackupStoragesPayload, unknown, BackupStorage[]>({
    queryKey: [BACKUP_STORAGES_QUERY_KEY, cluster, namespace],
    queryFn: () => getBackupStoragesFn(cluster, namespace),
    ...options,
  });
};

export const useCreateBackupStorage = (
  options?: UseMutationOptions<unknown, unknown, BackupStorage & { cluster: string }, unknown>
) =>
  useMutation({
    mutationFn: ({ cluster, ...formData }: BackupStorage & { cluster: string }) =>
      createBackupStorageFn(formData, cluster),
    ...options,
  });

export const useEditBackupStorage = (
  options?: UseMutationOptions<unknown, unknown, BackupStorage & { cluster: string }, unknown>
) =>
  useMutation({
    mutationFn: ({ cluster, ...formData }: BackupStorage & { cluster: string }) =>
      editBackupStorageFn(formData, cluster),
    ...options,
  });

export const useDeleteBackupStorage = (
  options?: UseMutationOptions<unknown, unknown, DeleteBackupStorageArgType, unknown>
) =>
  useMutation({
    mutationFn: ({ backupStorageId, namespace, cluster }: DeleteBackupStorageArgType) =>
      deleteBackupStorageFn(backupStorageId, namespace, cluster),
    ...options,
  });
