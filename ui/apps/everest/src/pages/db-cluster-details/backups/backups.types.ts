import { ScheduleWizardMode } from '@percona/types';
import { DbCluster } from 'shared-types/dbCluster.types';

export type ScheduleModalContextType = {
  dbCluster: DbCluster;
  mode: ScheduleWizardMode;
  setMode: React.Dispatch<React.SetStateAction<ScheduleWizardMode>>;
  selectedScheduleName: string;
  setSelectedScheduleName: React.Dispatch<React.SetStateAction<string>>;
  openScheduleModal: boolean;
  setOpenScheduleModal: React.Dispatch<React.SetStateAction<boolean>>;
  openOnDemandModal: boolean;
  setOpenOnDemandModal: React.Dispatch<React.SetStateAction<boolean>>;
};
