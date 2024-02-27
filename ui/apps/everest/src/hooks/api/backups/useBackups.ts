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
import { BackupFormData } from 'pages/db-cluster-details/backups/backups-list/on-demand-backup-modal/on-demand-backup-modal.types.ts';
import { PerconaQueryOptions } from 'shared-types/query.types';

export const BACKUPS_QUERY_KEY = 'backups';

export const useDbBackups = (
  dbClusterName: string,
  namespace: string,
  options?: PerconaQueryOptions<GetBackupsPayload, unknown, Backup[]>
) =>
  useQuery<GetBackupsPayload, unknown, Backup[]>({
    queryKey: [BACKUPS_QUERY_KEY, dbClusterName],
    queryFn: () => getBackupsFn(dbClusterName, namespace),
    select: ({ items = [] }) =>
      items.map(
        ({ metadata: { name }, status, spec: { backupStorageName } }) => ({
          name,
          created: status?.created ? new Date(status.created) : null,
          completed: status?.completed ? new Date(status.completed) : null,
          state: status ? mapBackupState(status?.state) : BackupStatus.UNKNOWN,
          dbClusterName,
          backupStorageName,
        })
      ),
    ...options,
  });

export const useCreateBackupOnDemand = (
  dbClusterName: string,
  namespace: string,
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
        namespace
      ),
    ...options,
  });

export const useDeleteBackup = (
  namespace: string,
  options?: UseMutationOptions<unknown, unknown, string, unknown>
) =>
  useMutation({
    mutationFn: (backupName: string) => deleteBackupFn(backupName, namespace),
    ...options,
  });

export const useDbClusterPitr = (
  dbClusterName: string,
  namespace: string,
  options?: PerconaQueryOptions<
    DatabaseClusterPitrPayload,
    unknown,
    DatabaseClusterPitr | undefined
  >
) =>
  useQuery<
    DatabaseClusterPitrPayload,
    unknown,
    DatabaseClusterPitr | undefined
  >({
    queryKey: [`${dbClusterName}-pitr`],
    queryFn: () => getPitrFn(dbClusterName, namespace),
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
  });
