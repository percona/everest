import { DbCluster } from 'shared-types/dbCluster.types';
import { ScheduleFormData } from '../schedule-form/schedule-form-schema';
import { ScheduleWizardMode, WizardMode } from '@percona/types';
import { kebabize } from '@percona/utils';

export type ScheduleFormDialogExternalContext =
  | 'db-wizard-new'
  | 'db-wizard-edit'
  | 'db-wizard-restore-from-backup'
  | 'db-details-backups';
export const dbWizardToScheduleFormDialogMap = (dbWizardMode: WizardMode) => {
  return `db-wizard-${kebabize(
    dbWizardMode
  )}` as ScheduleFormDialogExternalContext;
};
export type ScheduleFormDialogContextType = {
  mode: ScheduleWizardMode;
  externalContext?: ScheduleFormDialogExternalContext;
  setMode: React.Dispatch<React.SetStateAction<ScheduleWizardMode>>;
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
    activeStorage?: NonNullable<DbCluster['status']>['activeStorage'];
    dbEngine: DbCluster['spec']['engine']['type'];
    defaultSchedules: NonNullable<DbCluster['spec']['backup']>['schedules'];
  };
};
