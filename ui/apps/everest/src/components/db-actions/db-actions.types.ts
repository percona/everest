import { DbCluster } from 'shared-types/dbCluster.types';

export interface DbActionsProps {
  showDetailsAction?: boolean;
  showStatusActions?: boolean;
  dbCluster: DbCluster;
}
