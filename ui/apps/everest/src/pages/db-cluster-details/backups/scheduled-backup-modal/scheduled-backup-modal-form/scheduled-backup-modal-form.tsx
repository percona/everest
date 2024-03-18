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
import { useContext, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { ScheduleModalContext } from '../../backups.context.ts';
import { DbEngineType } from 'shared-types/dbEngines.types.ts';

export const ScheduledBackupModalForm = () => {
  const { watch, setValue, trigger } = useFormContext();
  const {
    mode = 'new',
    setSelectedScheduleName,
    dbCluster,
  } = useContext(ScheduleModalContext);

  const {
    metadata: { namespace },
  } = dbCluster;

  const { data: backupStorages = [], isFetching } =
    useBackupStoragesByNamespace(namespace);

  const dbClusterActiveStorage = dbCluster?.status?.activeStorage;
  const schedules = (dbCluster && dbCluster?.spec?.backup?.schedules) || [];
  const scheduleName = watch(ScheduleFormFields.scheduleName);

  useEffect(() => {
    if (mode === 'edit' && setSelectedScheduleName) {
      setSelectedScheduleName(scheduleName);
    }
  }, [scheduleName, mode, setSelectedScheduleName]);

  useEffect(() => {
    if (dbClusterActiveStorage) {
      setValue(ScheduleFormFields.storageLocation, {
        name: dbClusterActiveStorage,
      });
      trigger(ScheduleFormFields.storageLocation);
    }
  }, [dbClusterActiveStorage]);

  return (
    <ScheduleForm
      showTypeRadio={dbCluster.spec.engine.type === DbEngineType.PSMDB}
      allowScheduleSelection={mode === 'edit'}
      disableStorageSelection={!!dbClusterActiveStorage}
      autoFillLocation={mode === 'new'}
      schedules={schedules}
      storageLocationFetching={isFetching}
      storageLocationOptions={backupStorages}
    />
  );
};
