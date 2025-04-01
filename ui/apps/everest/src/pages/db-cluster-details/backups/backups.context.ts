import { createContext } from 'react';
import { ScheduleModalContextType } from './backups.types.ts';
import { DbCluster } from 'shared-types/dbCluster.types.ts';
import { WizardMode } from '@percona/types';

export const ScheduleModalContext = createContext<ScheduleModalContextType>({
  dbCluster: {} as DbCluster,
  openOnDemandModal: false,
  setOpenOnDemandModal: () => {},
  openScheduleModal: false,
  setOpenScheduleModal: () => {},
  mode: WizardMode.New,
  setMode: () => {},
  selectedScheduleName: '',
  setSelectedScheduleName: () => {},
});
