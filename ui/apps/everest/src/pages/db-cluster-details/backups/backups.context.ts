import { createContext } from 'react';
import { ScheduleModalContextType } from './backups.types.ts';
import { DbCluster } from 'shared-types/dbCluster.types.ts';

export const ScheduleModalContext = createContext<ScheduleModalContextType>({
  dbCluster: {} as DbCluster,
  openOnDemandModal: false,
  setOpenOnDemandModal: () => {},
  openScheduleModal: false,
  setOpenScheduleModal: () => {},
  mode: 'new',
  setMode: () => {},
  selectedScheduleName: '',
  setSelectedScheduleName: () => {},
});
