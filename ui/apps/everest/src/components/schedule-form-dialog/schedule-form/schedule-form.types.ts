import { TimeSelectionFields } from '../../time-selection/time-selection.types';
import { Schedule } from 'shared-types/dbCluster.types';
import { BackupStorage } from 'shared-types/backupStorages.types';

enum ScheduleForm {
  scheduleName = 'scheduleName',
  storageLocation = 'storageLocation',
  retentionCopies = 'retentionCopies',
}

export type ScheduleFormProps = {
  allowScheduleSelection?: boolean;
  disableStorageSelection?: boolean;
  disableNameInput?: boolean;
  autoFillLocation?: boolean;
  schedules: Schedule[];
  storageLocationFetching: boolean;
  storageLocationOptions: BackupStorage[];
  showTypeRadio: boolean;
  hideRetentionCopies?: boolean;
};

export const ScheduleFormFields = { ...ScheduleForm, ...TimeSelectionFields };
export type ScheduleFormFields = ScheduleForm | TimeSelectionFields;
