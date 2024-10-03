import { DbCluster } from 'shared-types/dbCluster.types';

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
}
