import { DbCluster } from 'shared-types/dbCluster.types';

export interface DbActionsProps {
  isDetailView?: boolean;
  openDetailsDialog?: boolean;
  dbCluster: DbCluster;
  setIsNewClusterMode: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenDetailsDialog?: React.Dispatch<React.SetStateAction<boolean>>;
  handleCloseDetailsDialog?: () => void;
  handleDbRestart: (dbCluster: DbCluster) => void;
  handleDbSuspendOrResumed: (dbCluster: DbCluster) => void;
  handleDeleteDbCluster: (dbCluster: DbCluster) => void;
  isPaused: (dbCluster: DbCluster) => boolean | undefined;
  handleRestoreDbCluster: (dbCluster: DbCluster) => void;
  isNewClusterMode: boolean;
  openRestoreDialog: boolean;
  handleCloseRestoreDialog: () => void;
}
