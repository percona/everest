import { MonitoringInstance } from 'shared-types/monitoring.types';

export interface MonitoringInstanceTableElement {
  type: string;
  url: string;
  name: string;
  namespace: string;
  cluster: string;
  raw: MonitoringInstance;
}
