import { DbCluster } from 'shared-types/dbCluster.types';

export interface DbActionsProps {
  isDetailView?: boolean;
  dbCluster: DbCluster;
  setIsNewClusterMode: React.Dispatch<React.SetStateAction<boolean>>;
  handleOpenDbDetailsDialog: (dbCluster: DbCluster) => void;
  handleRestoreDbCluster: (dbCluster: DbCluster) => void;
  handleDeleteDbCluster: (dbCluster: DbCluster) => void;
  handleDbRestart: (dbCluster: DbCluster) => void;
  handleDbSuspendOrResumed: (dbCluster: DbCluster) => void;
  isPaused: (dbCluster: DbCluster) => boolean | undefined;
}
