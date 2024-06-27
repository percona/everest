import { updateDbClusterFn } from 'api/dbClusterApi';
import { getCronExpressionFromFormValues } from 'components/time-selection/time-selection.utils';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { Schedule } from 'shared-types/dbCluster.types';
import { useDbCluster } from '../db-cluster/useDbCluster';
import { DbCluster } from 'shared-types/dbCluster.types';
import { ScheduleFormData } from 'components/schedule-form-dialog/schedule-form/schedule-form-schema';
import cronConverter from 'utils/cron-converter';

const backupScheduleFormValuesToDbClusterPayload = (
  dbPayload: ScheduleFormData,
  dbCluster: DbCluster,
  mode: 'edit' | 'new'
): DbCluster => {
  const {
    selectedTime,
    minute,
    hour,
    amPm,
    onDay,
    weekDay,
    scheduleName,
    retentionCopies,
  } = dbPayload;
  const originalSchedule = getCronExpressionFromFormValues({
    selectedTime,
    minute,
    hour,
    amPm,
    onDay,
    weekDay,
  });

  const backupSchedule = cronConverter(
    originalSchedule,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    'UTC'
  );
  let schedulesPayload: Schedule[] = [];
  if (mode === 'new') {
    schedulesPayload = [
      ...(dbCluster.spec.backup?.schedules || []).map((schedule) => ({
        ...schedule,
        schedule: cronConverter(
          schedule.schedule,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          'UTC'
        ),
      })),
      {
        enabled: true,
        retentionCopies: parseInt(retentionCopies, 10),
        name: scheduleName,
        backupStorageName:
          typeof dbPayload.storageLocation === 'string'
            ? dbPayload.storageLocation
            : dbPayload.storageLocation!.name,
        schedule: backupSchedule,
      },
    ];
  }

  if (mode === 'edit') {
    const newSchedulesArray = (dbCluster?.spec?.backup?.schedules || []).map(
      (schedule) => ({
        ...schedule,
        schedule: cronConverter(
          schedule.schedule,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          'UTC'
        ),
      })
    );
    const editedScheduleIndex = newSchedulesArray?.findIndex(
      (item) => item.name === scheduleName
    );
    if (newSchedulesArray && editedScheduleIndex !== undefined) {
      newSchedulesArray[editedScheduleIndex] = {
        enabled: true,
        name: scheduleName,
        retentionCopies: parseInt(retentionCopies, 10),
        backupStorageName:
          typeof dbPayload.storageLocation === 'string'
            ? dbPayload.storageLocation
            : dbPayload.storageLocation!.name,
        schedule: backupSchedule,
      };
      schedulesPayload = newSchedulesArray;
    }
  }

  return {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: dbCluster.metadata,
    spec: {
      ...dbCluster?.spec,
      backup: {
        ...dbCluster.spec.backup,
        enabled: schedulesPayload.length > 0,
        schedules: schedulesPayload.length > 0 ? schedulesPayload : undefined,
      },
    },
  };
};

const deletedScheduleToDbClusterPayload = (
  scheduleName: string,
  dbCluster: DbCluster
): DbCluster => {
  const schedules = dbCluster?.spec?.backup?.schedules || [];
  const filteredSchedulesWithCronCorrection = schedules.reduce(
    (result: Schedule[], schedule) => {
      if (schedule?.name !== scheduleName) {
        result.push({
          ...schedule,
          schedule: cronConverter(
            schedule.schedule,
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            'UTC'
          ),
        });
      }
      return result;
    },
    []
  );

  return {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: dbCluster.metadata,
    spec: {
      ...dbCluster?.spec,
      backup: {
        ...dbCluster.spec.backup,
        enabled: filteredSchedulesWithCronCorrection.length > 0,
        schedules:
          filteredSchedulesWithCronCorrection.length > 0
            ? filteredSchedulesWithCronCorrection
            : undefined,
      },
    },
  };
};

export const useUpdateSchedules = (
  dbClusterName: string,
  namespace: string,
  mode: 'new' | 'edit',
  options?: UseMutationOptions<unknown, unknown, ScheduleFormData, unknown>
) => {
  const { data: dbCluster } = useDbCluster(dbClusterName, namespace);

  return useMutation({
    mutationFn: (dbPayload: ScheduleFormData) => {
      const payload = backupScheduleFormValuesToDbClusterPayload(
        dbPayload,
        dbCluster!,
        mode
      );
      return updateDbClusterFn(dbClusterName, namespace, payload);
    },
    ...options,
  });
};

export const useDeleteSchedule = (
  dbClusterName: string,
  namespace: string,
  options?: UseMutationOptions<unknown, unknown, string, unknown>
) => {
  const { data: dbCluster } = useDbCluster(dbClusterName, namespace);

  return useMutation({
    mutationFn: (scheduleName: string) => {
      const payload = deletedScheduleToDbClusterPayload(
        scheduleName,
        dbCluster!
      );
      return updateDbClusterFn(dbClusterName, namespace, payload);
    },
    ...options,
  });
};
