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
  useMutation,
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

type HookUpdateParam = {
  instanceName: string;
  payload: UpdateMonitoringInstancePayload;
};

export const MONITORING_INSTANCES_QUERY_KEY = 'monitoringInstances';

export const useMonitoringInstancesList = (enabled?: boolean) =>
  useQuery<MonitoringInstanceList>({
    queryKey: [MONITORING_INSTANCES_QUERY_KEY],
    queryFn: getMonitoringInstancesFn,
    enabled,
  });

export const useCreateMonitoringInstance = (
  options?: UseMutationOptions<
    MonitoringInstance,
    unknown,
    CreateMonitoringInstancePayload,
    unknown
  >
) =>
  useMutation({
    mutationFn: createMonitoringInstanceFn,
    ...options,
  });

export const useDeleteMonitoringInstance = () =>
  useMutation({
    mutationFn: (instanceName: string) =>
      deleteMonitoringInstanceFn(instanceName),
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
