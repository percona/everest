export interface MonitoringInstance {
  type: string;
  url: string;
  name: string;
  allowedNamespaces: string[];
}

export type MonitoringInstanceList = MonitoringInstance[];

export type CreateMonitoringInstancePayload = MonitoringInstance & {
  pmm: {
    user: string;
    password: string;
  };
};

export type UpdateMonitoringInstancePayload = Omit<
  CreateMonitoringInstancePayload,
  'name'
>;
