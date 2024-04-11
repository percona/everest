import { createContext } from 'react';
import { ScheduleFormDialogContextType } from './schedule-form-dialog-context.types';
import { DbEngineType } from '@percona/types';

export const ScheduleFormDialogContext =
  createContext<ScheduleFormDialogContextType>({
    openScheduleModal: false,
    setOpenScheduleModal: () => {},
    handleClose: () => {},
    mode: 'new',
    setMode: () => {},
    selectedScheduleName: '',
    setSelectedScheduleName: () => {},
    isPending: false,
    handleSubmit: () => {},
    dbClusterInfo: {
      dbClusterName: '',
      namespace: '',
      schedules: [],
      activeStorage: '',
      dbType: '' as DbEngineType,
    },
  });
