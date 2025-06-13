import {
  useMutation,
  UseMutationOptions,
  useQuery,
} from '@tanstack/react-query';
import {
  createBackupOnDemand,
  deleteBackupFn,
  getBackupsFn,
  getPitrFn,
} from 'api/backups';
import {
  Backup,
  BackupStatus,
  DatabaseClusterPitr,
  DatabaseClusterPitrPayload,
  GetBackupsPayload,
  SingleBackupPayload,
} from 'shared-types/backups.types';
import { mapBackupState } from 'utils/backups';
import { BackupFormData } from 'pages/db-cluster-details/backups/on-demand-backup-modal/on-demand-backup-modal.types';
import { PerconaQueryOptions } from 'shared-types/query.types';
import { useRBACPermissions } from 'hooks/rbac';

export const BACKUPS_QUERY_KEY = 'backups';

type DeleteBackupArgType = {
  backupName: string;
  cleanupBackupStorage: boolean;
};

export const useDbBackups = (
  dbClusterName: string,
  namespace: string,
  cluster: string = 'in-cluster',
  options?: PerconaQueryOptions<GetBackupsPayload, unknown, Backup[]>
) => {
  const { canRead } = useRBACPermissions(
    'database-cluster-backups',
    `${namespace}/${dbClusterName}`
  );
  return useQuery<GetBackupsPayload, unknown, Backup[]>({
    queryKey: [BACKUPS_QUERY_KEY, namespace, dbClusterName, cluster],
    queryFn: () => getBackupsFn(dbClusterName, namespace, cluster),
    select: canRead
      ? ({ items = [] }) =>
          items.map(
            ({ metadata: { name }, status, spec: { backupStorageName } }) => ({
              name,
              created: status?.created ? new Date(status.created) : null,
              completed: status?.completed ? new Date(status.completed) : null,
              state: status
                ? mapBackupState(status?.state)
                : BackupStatus.UNKNOWN,
              dbClusterName,
              backupStorageName,
            })
          )
      : () => [],
    ...options,
    enabled: (options?.enabled ?? true) && canRead,
  });
};

export const useCreateBackupOnDemand = (
  dbClusterName: string,
  namespace: string,
  cluster: string = 'in-cluster',
  options?: UseMutationOptions<
    SingleBackupPayload,
    unknown,
    BackupFormData,
    unknown
  >
) =>
  useMutation({
    mutationFn: (formData: BackupFormData) =>
      createBackupOnDemand(
        {
          apiVersion: 'everest.percona.com/v1alpha1',
          kind: 'DatabaseClusterBackup',
          metadata: {
            name: formData.name,
          },
          spec: {
            dbClusterName,
            backupStorageName:
              typeof formData.storageLocation === 'string'
                ? formData.storageLocation
                : formData.storageLocation!.name,
          },
        },
        namespace,
        cluster
      ),
    ...options,
  });

export const useDeleteBackup = (
  namespace: string,
  cluster: string = 'in-cluster',
  options?: UseMutationOptions<unknown, unknown, DeleteBackupArgType, unknown>
) =>
  useMutation({
    mutationFn: ({ backupName, cleanupBackupStorage }: DeleteBackupArgType) =>
      deleteBackupFn(backupName, namespace, cleanupBackupStorage, cluster),
    ...options,
  });

export const useDbClusterPitr = (
  dbClusterName: string,
  namespace: string,
  cluster: string = 'in-cluster',
  options?: PerconaQueryOptions<
    DatabaseClusterPitrPayload,
    unknown,
    DatabaseClusterPitr | undefined
  >
) => {
  const { canRead } = useRBACPermissions(
    'database-clusters',
    `${namespace}/${dbClusterName}`
  );

  return useQuery<
    DatabaseClusterPitrPayload,
    unknown,
    DatabaseClusterPitr | undefined
  >({
    queryKey: [dbClusterName, 'pitr', cluster],
    queryFn: () => getPitrFn(dbClusterName, namespace, cluster),
    select: (pitrData) => {
      const { earliestDate, latestDate, latestBackupName, gaps } = pitrData;
      if (
        !Object.keys(pitrData).length ||
        !earliestDate ||
        !latestDate ||
        !latestBackupName
      ) {
        return undefined;
      }

      return {
        earliestDate: new Date(earliestDate),
        latestDate: new Date(latestDate),
        latestBackupName,
        gaps,
      };
    },
    ...options,
    enabled: (options?.enabled ?? true) && canRead,
  });
};
