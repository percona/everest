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

import { useBackupStoragesByNamespace } from 'hooks/api/backup-storages/useBackupStorages.ts';
import { useContext, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { DbEngineType } from 'shared-types/dbEngines.types.ts';
import { ScheduleFormDialogContext } from '../schedule-form-dialog-context/schedule-form-dialog.context';
import { ScheduleFormFields } from '../schedule-form/schedule-form.types';
import { ScheduleForm } from '../schedule-form/schedule-form';

export const ScheduleFormWrapper = () => {
  const { watch, setValue, trigger } = useFormContext();
  const {
    mode = 'new',
    setSelectedScheduleName,
    dbClusterInfo,
  } = useContext(ScheduleFormDialogContext);
  const { namespace, schedules = [], activeStorage, dbEngine } = dbClusterInfo;
  const { data: backupStorages = [], isFetching } =
    useBackupStoragesByNamespace(namespace);

  const [scheduleName] = watch([ScheduleFormFields.scheduleName]);
  const [amPm, hour, minute, onDay, weekDay, selectedTime] = watch([
    ScheduleFormFields.amPm,
    ScheduleFormFields.hour,
    ScheduleFormFields.minute,
    ScheduleFormFields.onDay,
    ScheduleFormFields.weekDay,
    ScheduleFormFields.selectedTime,
  ]);

  useEffect(() => {
    // This allowed us to get an error from zod .superRefine to avoid duplication of checking the schedule with the same time
    trigger();
  }, [amPm, hour, minute, onDay, weekDay, selectedTime]);

  useEffect(() => {
    if (mode === 'edit' && setSelectedScheduleName) {
      setSelectedScheduleName(scheduleName);
    }
  }, [scheduleName, mode, setSelectedScheduleName]);

  useEffect(() => {
    if (activeStorage) {
      setValue(ScheduleFormFields.storageLocation, {
        name: activeStorage,
      });
      trigger(ScheduleFormFields.storageLocation);
    }
  }, [activeStorage, setValue, trigger]);

  return (
    <ScheduleForm
      showTypeRadio={dbEngine === DbEngineType.PSMDB}
      hideRetentionCopies={dbEngine === DbEngineType.POSTGRESQL}
      allowScheduleSelection={mode === 'edit'}
      disableStorageSelection={!!activeStorage}
      autoFillLocation={mode === 'new'}
      schedules={schedules}
      storageLocationFetching={isFetching}
      storageLocationOptions={backupStorages}
    />
  );
};
