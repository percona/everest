import { DbCluster } from 'shared-types/dbCluster.types';
import { ScheduleFormData } from '../../schedule-form/schedule-form-schema';

export type ScheduleFormDialogContextType = {
  mode: 'new' | 'edit';
  setMode: React.Dispatch<React.SetStateAction<'new' | 'edit'>>;
  selectedScheduleName: string;
  setSelectedScheduleName: React.Dispatch<React.SetStateAction<string>>;
  openScheduleModal: boolean;
  setOpenScheduleModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleClose: () => void;
  handleSubmit: (data: ScheduleFormData) => void;
  isPending: boolean;
  dbClusterInfo: {
    dbClusterName?: DbCluster['metadata']['name'];
    namespace: DbCluster['metadata']['namespace'];
    schedules: NonNullable<DbCluster['spec']['backup']>['schedules'];
    activeStorage: NonNullable<DbCluster['status']>['activeStorage'];
    dbType: DbCluster['spec']['engine']['type'];
  };
};
