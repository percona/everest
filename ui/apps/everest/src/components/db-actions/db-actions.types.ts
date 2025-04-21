import { DbCluster } from 'shared-types/dbCluster.types';

export interface DbActionsProps {
  isDbDetailsView?: boolean;
  isStatusDetailView?: boolean;
  dbCluster: DbCluster;
}
