import { api } from './api';
import {
  CreateMonitoringInstancePayload,
  MonitoringInstanceList,
  UpdateMonitoringInstancePayload,
} from 'shared-types/monitoring.types';

const filterPmmDataInPayload = (
  payload: CreateMonitoringInstancePayload | UpdateMonitoringInstancePayload
) => {
  // @ts-ignore
  ['user', 'password'].forEach((key: keyof typeof payload.pmm) => {
    if (!payload.pmm[key]) {
      delete payload.pmm[key];
    }
  });

  return payload;
};

export const getMonitoringInstancesFn = async (namespace: string) => {
  const response = await api.get<MonitoringInstanceList>(
    `namespaces/${namespace}/monitoring-instances`
  );
  return response.data;
};

export const createMonitoringInstanceFn = async (
  payload: CreateMonitoringInstancePayload,
  namespace: string
) => {
  const response = await api.post(
    `namespaces/${namespace}/monitoring-instances`,
    filterPmmDataInPayload(payload)
  );

  return response.data;
};

export const deleteMonitoringInstanceFn = async (
  instanceName: string,
  namespace: string
) => {
  const response = await api.delete(
    `namespaces/${namespace}/monitoring-instances/${instanceName}`
  );

  return response.data;
};

export const updateMonitoringInstanceFn = async (
  instanceName: string,
  payload: UpdateMonitoringInstancePayload
) => {
  const { namespace } = payload;

  const response = await api.patch(
    `namespaces/${namespace}/monitoring-instances/${instanceName}`,
    filterPmmDataInPayload(payload)
  );

  return response.data;
};
