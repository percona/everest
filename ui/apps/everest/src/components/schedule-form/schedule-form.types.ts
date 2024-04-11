import { TimeSelectionFields } from '../time-selection/time-selection.types';

enum ScheduleForm {
  scheduleName = 'scheduleName',
  storageLocation = 'storageLocation',
  retentionCopies = 'retentionCopies',
}

export const ScheduleFormFields = { ...ScheduleForm, ...TimeSelectionFields };
export type ScheduleFormFields = ScheduleForm | TimeSelectionFields;
