import { DbCluster } from 'shared-types/dbCluster.types';
import { ScheduleFormData } from '../schedule-form/schedule-form-schema';
import { DbWizardMode } from 'pages/database-form/database-form.types';
import { kebabize } from '@percona/utils';
export type ScheduleFormDialogExternalContext =
  | 'db-wizard-new'
  | 'db-wizard-edit'
  | 'db-wizard-restore-from-backup'
  | 'db-details-backups';
export const dbWizardToScheduleFormDialogMap = (dbWizardMode: DbWizardMode) => {
  return `db-wizard-${kebabize(
    dbWizardMode
  )}` as ScheduleFormDialogExternalContext;
};
export type ScheduleFormDialogContextType = {
  mode: 'new' | 'edit';
  externalContext?: ScheduleFormDialogExternalContext;
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
    activeStorage?: NonNullable<DbCluster['status']>['activeStorage'];
    dbEngine: DbCluster['spec']['engine']['type'];
    defaultSchedules: NonNullable<DbCluster['spec']['backup']>['schedules'];
  };
};
