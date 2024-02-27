import { updateDbClusterFn } from 'api/dbClusterApi';
import { ScheduleFormData } from 'components/schedule-form/schedule-form-schema.ts';
import { getCronExpressionFromFormValues } from 'components/time-selection/time-selection.utils';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { Schedule } from 'shared-types/dbCluster.types';
import { useDbCluster } from '../db-cluster/useDbCluster';
import { DbCluster } from 'shared-types/dbCluster.types';

const backupScheduleFormValuesToDbClusterPayload = (
  dbPayload: ScheduleFormData,
  dbCluster: DbCluster,
  mode: 'edit' | 'new'
): DbCluster => {
  const { selectedTime, minute, hour, amPm, onDay, weekDay, scheduleName } =
    dbPayload;
  const backupSchedule = getCronExpressionFromFormValues({
    selectedTime,
    minute,
    hour,
    amPm,
    onDay,
    weekDay,
  });
  let schedulesPayload: Schedule[] = [];
  if (mode === 'new') {
    schedulesPayload = [
      ...(dbCluster.spec.backup?.schedules ?? []),
      {
        enabled: true,
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
    const newSchedulesArray = dbCluster?.spec?.backup?.schedules && [
      ...(dbCluster?.spec?.backup?.schedules || []),
    ];
    const editedScheduleIndex = newSchedulesArray?.findIndex(
      (item) => item.name === scheduleName
    );
    if (newSchedulesArray && editedScheduleIndex !== undefined) {
      newSchedulesArray[editedScheduleIndex] = {
        enabled: true,
        name: scheduleName,
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
        enabled: true,
        schedules: schedulesPayload,
      },
    },
  };
};

const deletedScheduleToDbClusterPayload = (
  scheduleName: string,
  dbCluster: DbCluster
): DbCluster => {
  const schedules = dbCluster?.spec?.backup?.schedules || [];
  const filteredSchedules = schedules.filter(
    (item) => item?.name !== scheduleName
  );

  return {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: dbCluster.metadata,
    spec: {
      ...dbCluster?.spec,
      backup: {
        ...dbCluster.spec.backup,
        enabled: true,
        schedules: filteredSchedules,
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
