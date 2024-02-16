import { DbType } from '@percona/types';
import { ScheduleForm } from 'components/schedule-form/schedule-form.tsx';
import { useBackupStorages } from 'hooks/api/backup-storages/useBackupStorages.ts';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { DbWizardFormFields } from '../../../database-form.types.ts';
import { useDatabasePageDefaultValues } from '../../../useDatabaseFormDefaultValues.ts';
import { useDatabasePageMode } from '../../../useDatabasePageMode.ts';
import { generateShortUID } from '../../first/utils.ts';
import { ScheduleBackupSectionProps } from './schedule-section.types.ts';

export const ScheduleBackupSection = ({
  enableNameGeneration,
}: ScheduleBackupSectionProps) => {
  const mode = useDatabasePageMode();
  const { setValue, getFieldState, watch } = useFormContext();
  const { data: backupStorages = [], isFetching } = useBackupStorages();
  const { dbClusterData } = useDatabasePageDefaultValues(mode);
  const [storageLocationField, dbType] = watch([
    DbWizardFormFields.storageLocation,
    DbWizardFormFields.dbType,
  ]);

  useEffect(() => {
    if (mode === 'new' && backupStorages?.length > 0) {
      setValue(DbWizardFormFields.storageLocation, {
        name: backupStorages[0].name,
      });
    }
    if (
      (mode === 'edit' || mode === 'restoreFromBackup') &&
      backupStorages?.length > 0 &&
      !!storageLocationField
    ) {
      setValue(DbWizardFormFields.storageLocation, {
        name: backupStorages[0].name,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupStorages, mode]);

  const schedules =
    mode === 'new' ? [] : dbClusterData?.spec?.backup?.schedules || [];

  useEffect(() => {
    const { isDirty: nameDirty } = getFieldState(
      DbWizardFormFields.scheduleName
    );

    if (!enableNameGeneration) {
      return;
    }

    if (
      (!nameDirty && mode === 'new') ||
      (mode === 'edit' && schedules?.length === 0)
    ) {
      setValue(
        DbWizardFormFields.scheduleName,
        `backup-${generateShortUID()}`,
        {
          shouldValidate: true,
        }
      );
    }
  }, [enableNameGeneration, schedules?.length]);

  return (
    <ScheduleForm
      disableNameInput={mode === 'edit' && schedules.length === 1}
      autoFillLocation
      schedules={schedules}
      storageLocationFetching={isFetching}
      storageLocationOptions={backupStorages}
      disableStorageSelection={mode === 'edit' && dbType === DbType.Mongo}
    />
  );
};
