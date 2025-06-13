import { DbCluster } from 'shared-types/dbCluster.types';

export interface DbActionsProps {
  isDetailView?: boolean;
  dbCluster: DbCluster;
  cluster?: string;
}
