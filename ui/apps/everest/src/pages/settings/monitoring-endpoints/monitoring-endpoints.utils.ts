import { MonitoringInstanceForNamespaceResult } from 'hooks/api/monitoring/useMonitoringInstancesList';
import { MonitoringInstanceTableElement } from './monitoring-endpoints.types';

export const convertMonitoringInstancesPayloadToTableFormat = (
  data: MonitoringInstanceForNamespaceResult[]
): MonitoringInstanceTableElement[] => {
  const result: MonitoringInstanceTableElement[] = [];
  data.forEach((item) => {
    const tableDataForNamespace: MonitoringInstanceTableElement[] = item
      ?.queryResult?.isSuccess
      ? item.queryResult?.data.map((monitoring) => ({
          namespace: item.namespace,
          cluster: item.cluster,
          name: monitoring.name,
          type: monitoring.type,
          url: monitoring.url,
          raw: monitoring,
        }))
      : [];
    result.push(...tableDataForNamespace);
  });
  return result;
};
