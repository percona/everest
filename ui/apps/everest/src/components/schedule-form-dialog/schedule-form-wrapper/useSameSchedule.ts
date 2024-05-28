import { ScheduleFormFields } from '../schedule-form/schedule-form.types';
import { useFormContext } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { getCronExpressionFromFormValues } from '../../time-selection/time-selection.utils';
import { Schedule } from '../../../shared-types/dbCluster.types';

export const useSameSchedule = (
  schedules: Schedule[]
): [isSameSchedule: boolean] => {
  const [isSameSchedule, setSameSchedule] = useState(false);
  const { watch } = useFormContext();

  const [storageLocation, amPm, hour, minute, onDay, weekDay, selectedTime] =
    watch([
      ScheduleFormFields.storageLocation,
      ScheduleFormFields.amPm,
      ScheduleFormFields.hour,
      ScheduleFormFields.minute,
      ScheduleFormFields.onDay,
      ScheduleFormFields.weekDay,
      ScheduleFormFields.selectedTime,
    ]);

  const currentSchedule = useMemo(
    () =>
      getCronExpressionFromFormValues({
        selectedTime,
        amPm,
        hour,
        minute,
        onDay,
        weekDay,
      }),
    [amPm, hour, minute, onDay, weekDay, selectedTime]
  );

  useEffect(() => {
    const sameSchedule = schedules.find(
      (item) =>
        item.schedule === currentSchedule &&
        item.backupStorageName === storageLocation?.name
    );
    if (sameSchedule) {
      setSameSchedule(true);
    } else {
      setSameSchedule(false);
    }
  }, [currentSchedule, schedules, storageLocation]);

  return [isSameSchedule];
};
