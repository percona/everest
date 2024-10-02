import { DbCluster } from 'shared-types/dbCluster.types';

export interface DbActionsProps {
  isDetailView?: boolean;
  dbCluster: DbCluster;
  isNewClusterMode: boolean;
  setIsNewClusterMode: React.Dispatch<React.SetStateAction<boolean>>;
  openDetailsDialog?: boolean;
  setOpenDetailsDialog?: React.Dispatch<React.SetStateAction<boolean>>;
  handleCloseDetailsDialog?: () => void;
  openRestoreDialog: boolean;
  handleRestoreDbCluster: (dbCluster: DbCluster) => void;
  handleCloseRestoreDialog: () => void;
  openDeleteDialog: boolean;
  handleDeleteDbCluster: (dbCluster: DbCluster) => void;
  handleCloseDeleteDialog: () => void;
  handleConfirmDelete: (dataCheckbox: boolean) => void;
  handleDbRestart: (dbCluster: DbCluster) => void;
  handleDbSuspendOrResumed: (dbCluster: DbCluster) => void;
  isPaused: (dbCluster: DbCluster) => boolean | undefined;
}
