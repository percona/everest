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

type HookUpdateParam = {
  instanceName: string;
  payload: UpdateMonitoringInstancePayload;
};

export const MONITORING_INSTANCES_QUERY_KEY = 'monitoringInstances';

export interface MonitoringInstanceForNamespaceResult {
  namespace: string;
  queryResult: UseQueryResult<MonitoringInstance[], unknown>;
}

export const useMonitoringInstancesList = (
  namespaces: string[],
  enabled?: boolean
) => {
  const queries = namespaces.map<
    UseQueryOptions<MonitoringInstanceList, unknown, MonitoringInstance[]>
  >((namespace) => ({
    queryKey: [MONITORING_INSTANCES_QUERY_KEY, namespace],
    retry: false,
    queryFn: () => getMonitoringInstancesFn(namespace),
    refetchInterval: 5 * 1000,
    enabled,
  }));
  const queryResults = useQueries({ queries });

  const results: MonitoringInstanceForNamespaceResult[] = queryResults.map(
    (item, i) => ({
      namespace: namespaces[i],
      queryResult: item,
    })
  );

  return results;
};

export const useCreateMonitoringInstance = (
  options?: UseMutationOptions<
    MonitoringInstance,
    unknown,
    CreateMonitoringInstancePayload,
    unknown
  >
) =>
  useMutation({
    mutationFn: (payload: CreateMonitoringInstancePayload) =>
      createMonitoringInstanceFn(payload, payload.namespace),
    ...options,
  });

type DeleteMonitoringInstanceArgType = {
  instanceName: string;
  namespace: string;
};

export const useDeleteMonitoringInstance = () =>
  useMutation({
    mutationFn: ({
      instanceName,
      namespace,
    }: DeleteMonitoringInstanceArgType) =>
      deleteMonitoringInstanceFn(instanceName, namespace),
  });

export const useUpdateMonitoringInstance = (
  options?: UseMutationOptions<
    MonitoringInstance,
    unknown,
    HookUpdateParam,
    unknown
  >
) =>
  useMutation({
    mutationFn: ({ instanceName, payload }: HookUpdateParam) =>
      updateMonitoringInstanceFn(instanceName, payload),
    ...options,
  });
