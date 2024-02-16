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

export const getMonitoringInstancesFn = async () => {
  const response = await api.get<MonitoringInstanceList>(
    'monitoring-instances'
  );
  return response.data;
};

export const createMonitoringInstanceFn = async (
  payload: CreateMonitoringInstancePayload
) => {
  const response = await api.post(
    'monitoring-instances',
    filterPmmDataInPayload(payload)
  );

  return response.data;
};

export const deleteMonitoringInstanceFn = async (instanceName: string) => {
  const response = await api.delete(`monitoring-instances/${instanceName}`);

  return response.data;
};

export const updateMonitoringInstanceFn = async (
  instanceName: string,
  payload: UpdateMonitoringInstancePayload
) => {
  const response = await api.patch(
    `monitoring-instances/${instanceName}`,
    filterPmmDataInPayload(payload)
  );

  return response.data;
};
