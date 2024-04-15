// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ScheduleFormFields } from 'components/schedule-form/schedule-form.types';
import { Schedule } from 'shared-types/dbCluster.types.ts';
import { getFormValuesFromCronExpression } from 'components/time-selection/time-selection.utils.ts';
import { generateShortUID } from '../../pages/database-form/database-form-body/steps/first/utils';
import { TIME_SELECTION_DEFAULTS } from '../time-selection/time-selection.constants';
import { ScheduleFormData } from '../schedule-form/schedule-form-schema';

export const scheduleModalDefaultValues = (
  mode: 'new' | 'edit',
  selectedSchedule?: Schedule
): ScheduleFormData => {
  if (mode === 'edit' && selectedSchedule) {
    const { name, backupStorageName, schedule, retentionCopies } =
      selectedSchedule;
    const formValues = getFormValuesFromCronExpression(schedule);
    return {
      [ScheduleFormFields.scheduleName]: name || '',
      [ScheduleFormFields.storageLocation]: { name: backupStorageName } || null,
      [ScheduleFormFields.retentionCopies]: retentionCopies?.toString() || '0',
      ...formValues,
    };
  }
  return {
    [ScheduleFormFields.scheduleName]: `backup-${generateShortUID()}`,
    [ScheduleFormFields.storageLocation]: null,
    [ScheduleFormFields.retentionCopies]: '0',
    ...TIME_SELECTION_DEFAULTS,
  };
};
