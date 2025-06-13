import { UseMutationResult } from '@tanstack/react-query';
import { DbCluster } from 'shared-types/dbCluster.types';

export interface DeleteDbClusterPayload {
  dbClusterName: string;
  namespace: string;
  cleanupBackupStorage: boolean;
}

export interface DbActionsModalsProps {
  dbCluster: DbCluster;
  isNewClusterMode: boolean;
  openDetailsDialog?: boolean;
  handleCloseDetailsDialog?: () => void;
  openRestoreDialog: boolean;
  handleCloseRestoreDialog: () => void;
  openDeleteDialog: boolean;
  handleCloseDeleteDialog: () => void;
  handleConfirmDelete: (dataCheckbox: boolean) => void;
  deleteMutation: UseMutationResult<
    DbCluster,
    Error,
    DeleteDbClusterPayload,
    unknown
  >;
}
