import { DbCluster } from 'shared-types/dbCluster.types';

export type ScheduleModalContextType = {
  dbCluster: DbCluster;
  mode?: 'new' | 'edit';
  setMode?: React.Dispatch<React.SetStateAction<'new' | 'edit'>>;
  selectedScheduleName?: string;
  setSelectedScheduleName?: React.Dispatch<React.SetStateAction<string>>;
  openScheduleModal?: boolean;
  setOpenScheduleModal?: React.Dispatch<React.SetStateAction<boolean>>;
};
