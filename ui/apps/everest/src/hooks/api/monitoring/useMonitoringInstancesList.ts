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
  UseMutationOptions,
  UseQueryOptions,
  UseQueryResult,
  useMutation,
  useQueries,
  useQuery,
} from '@tanstack/react-query';
import {
  getMonitoringInstancesFn,
  createMonitoringInstanceFn,
  deleteMonitoringInstanceFn,
  updateMonitoringInstanceFn,
} from 'api/monitoring';
import {
  CreateMonitoringInstancePayload,
  MonitoringInstance,
  MonitoringInstanceList,
  UpdateMonitoringInstancePayload,
} from 'shared-types/monitoring.types';
import { PerconaQueryOptions } from 'shared-types/query.types';

type HookUpdateParam = {
  instanceName: string;
  payload: UpdateMonitoringInstancePayload;
};

export const MONITORING_INSTANCES_QUERY_KEY = 'monitoringInstances';

export interface MonitoringInstanceForNamespaceResult {
  namespace: string;
  cluster: string;
  queryResult: UseQueryResult<MonitoringInstanceList, unknown>;
}

export const useMonitoringInstancesList = (
  queryParams: Array<{
    namespace: string;
    cluster?: string;
    options?: PerconaQueryOptions<
      MonitoringInstanceList,
      unknown,
      MonitoringInstance[]
    >;
  }>
) => {
  const queries = queryParams.map<
    UseQueryOptions<MonitoringInstanceList, unknown, MonitoringInstance[]>
  >(({ namespace, cluster = 'in-cluster', options }) => {
    return {
      queryKey: [MONITORING_INSTANCES_QUERY_KEY, cluster, namespace],
      queryFn: () => getMonitoringInstancesFn(cluster, namespace),
      refetchInterval: 5 * 1000,
      ...options,
    };
  });
  const queryResults = useQueries({ queries });

  const results: MonitoringInstanceForNamespaceResult[] = queryResults.map(
    (item, i) => ({
      namespace: queryParams[i].namespace,
      cluster: queryParams[i].cluster || 'in-cluster',
      queryResult: item,
    })
  );

  return results;
};

export const useMonitoringInstancesForNamespace = (
  namespace: string,
  cluster: string = 'in-cluster'
) => {
  return useQuery({
    queryKey: [MONITORING_INSTANCES_QUERY_KEY, cluster, namespace],
    queryFn: () => getMonitoringInstancesFn(cluster, namespace),
    refetchInterval: 5 * 1000,
  });
};

export const useCreateMonitoringInstance = (
  options?: UseMutationOptions<
    MonitoringInstance,
    unknown,
    CreateMonitoringInstancePayload & { cluster?: string },
    unknown
  >
) =>
  useMutation({
    mutationFn: (payload: CreateMonitoringInstancePayload & { cluster?: string }) =>
      createMonitoringInstanceFn(payload, payload.namespace, payload.cluster || 'in-cluster'),
    ...options,
  });

type DeleteMonitoringInstanceArgType = {
  instanceName: string;
  namespace: string;
  cluster?: string;
};

export const useDeleteMonitoringInstance = () =>
  useMutation({
    mutationFn: ({
      instanceName,
      namespace,
      cluster = 'in-cluster',
    }: DeleteMonitoringInstanceArgType) =>
      deleteMonitoringInstanceFn(instanceName, namespace, cluster),
  });

export const useUpdateMonitoringInstance = (
  options?: UseMutationOptions<
    MonitoringInstance,
    unknown,
    HookUpdateParam & { cluster?: string },
    unknown
  >
) =>
  useMutation({
    mutationFn: ({ instanceName, payload, cluster = 'in-cluster' }: HookUpdateParam & { cluster?: string }) =>
      updateMonitoringInstanceFn(instanceName, payload, cluster),
    ...options,
  });
