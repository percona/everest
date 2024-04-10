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

import { ScheduleForm } from 'components/schedule-form/schedule-form.tsx';
import { ScheduleFormFields } from 'components/schedule-form/schedule-form.types.ts';
import { useBackupStoragesByNamespace } from 'hooks/api/backup-storages/useBackupStorages.ts';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { DbEngineType } from 'shared-types/dbEngines.types.ts';
import { Schedule } from '../../../../../shared-types/dbCluster.types';

interface ScheduledBackupModalFormProps {
  namespace: string;
  activeStorage?: string;
  schedules: Schedule[];
  mode: 'new' | 'edit';
  setSelectedScheduleName: (name: string) => void;
  dbEngineType: DbEngineType;
}

export const ScheduledBackupModalForm = ({
  namespace,
  activeStorage,
  schedules,
  mode,
  setSelectedScheduleName,
  dbEngineType,
}: ScheduledBackupModalFormProps) => {
  const { watch, setValue, trigger } = useFormContext();

  const { data: backupStorages = [], isFetching } =
    useBackupStoragesByNamespace(namespace);

  const scheduleName = watch(ScheduleFormFields.scheduleName);

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
  }, [activeStorage]);

  return (
    <ScheduleForm
      showTypeRadio={dbEngineType === DbEngineType.PSMDB}
      allowScheduleSelection={mode === 'edit'}
      disableStorageSelection={!!activeStorage}
      autoFillLocation={mode === 'new'}
      schedules={schedules}
      storageLocationFetching={isFetching}
      storageLocationOptions={backupStorages}
    />
  );
};
