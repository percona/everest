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

export const getMonitoringInstancesFn = async (cluster: string, namespace: string) => {
  const response = await api.get<MonitoringInstanceList>(
    `clusters/${cluster}/namespaces/${namespace}/monitoring-instances`
  );
  return response.data;
};

export const createMonitoringInstanceFn = async (
  payload: CreateMonitoringInstancePayload,
  namespace: string,
  cluster: string
) => {
  const response = await api.post(
    `clusters/${cluster}/namespaces/${namespace}/monitoring-instances`,
    filterPmmDataInPayload(payload)
  );

  return response.data;
};

export const deleteMonitoringInstanceFn = async (
  instanceName: string,
  namespace: string,
  cluster: string
) => {
  const response = await api.delete(
    `clusters/${cluster}/namespaces/${namespace}/monitoring-instances/${instanceName}`
  );

  return response.data;
};

export const updateMonitoringInstanceFn = async (
  instanceName: string,
  payload: UpdateMonitoringInstancePayload,
  cluster: string
) => {
  const { namespace } = payload;

  const response = await api.patch(
    `clusters/${cluster}/namespaces/${namespace}/monitoring-instances/${instanceName}`,
    filterPmmDataInPayload(payload)
  );

  return response.data;
};
