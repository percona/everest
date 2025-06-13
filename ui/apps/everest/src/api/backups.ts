import {
  BackupPayload,
  DatabaseClusterPitrPayload,
  GetBackupsPayload,
  SingleBackupPayload,
} from 'shared-types/backups.types';
import { api } from './api';

export const getBackupsFn = async (
  dbClusterName: string,
  namespace: string,
  cluster: string
) => {
  const response = await api.get<GetBackupsPayload>(
    `clusters/${cluster}/namespaces/${namespace}/database-clusters/${dbClusterName}/backups`
  );

  return response.data;
};

export const createBackupOnDemand = async (
  payload: BackupPayload,
  namespace: string,
  cluster: string
) => {
  const response = await api.post<SingleBackupPayload>(
    `clusters/${cluster}/namespaces/${namespace}/database-cluster-backups`,
    payload
  );
  return response.data;
};

export const deleteBackupFn = async (
  backupName: string,
  namespace: string,
  cleanupBackupStorage: boolean,
  cluster: string
) => {
  const response = await api.delete(
    `clusters/${cluster}/namespaces/${namespace}/database-cluster-backups/${backupName}?cleanupBackupStorage=${cleanupBackupStorage}`
  );
  return response.data;
};

export const getPitrFn = async (
  dbClusterName: string,
  namespace: string,
  cluster: string
) => {
  const response = await api.get<DatabaseClusterPitrPayload>(
    `clusters/${cluster}/namespaces/${namespace}/database-clusters/${dbClusterName}/pitr`,
    {
      disableNotifications: true,
    }
  );

  return response.data;
};
