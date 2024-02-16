import { TimeSelectionFields } from '../time-selection/time-selection.types';

enum ScheduleForm {
  scheduleName = 'scheduleName',
  storageLocation = 'storageLocation',
}

export const ScheduleFormFields = { ...ScheduleForm, ...TimeSelectionFields };
export type ScheduleFormFields = ScheduleForm | TimeSelectionFields;
