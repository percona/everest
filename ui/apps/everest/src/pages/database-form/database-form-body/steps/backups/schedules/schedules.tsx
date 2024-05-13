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

import { Stack, Typography } from '@mui/material';
import EditableItem from 'components/editable-item/editable-item';
import { LabeledContent } from '@percona/ui-lib';
import { Messages } from './schedules.messages';
import { useEffect, useState } from 'react';
import { DbWizardFormFields } from '../../../../database-form.types';
import { useFormContext } from 'react-hook-form';
import { Schedule } from 'shared-types/dbCluster.types';
import {
  getSchedulesPayload,
  removeScheduleFromArray,
} from 'components/schedule-form-dialog/schedule-form/schedule-form.utils';
import ScheduleContent from './schedule-body';
import { ScheduleFormDialog } from 'components/schedule-form-dialog';
import { ScheduleFormDialogContext } from 'components/schedule-form-dialog/schedule-form-dialog-context/schedule-form-dialog.context';
import { ScheduleFormData } from 'components/schedule-form-dialog/schedule-form/schedule-form-schema';
import { dbTypeToDbEngine } from '@percona/utils';
import { DbType } from '@percona/types';

const Schedules = () => {
  const { watch, setValue } = useFormContext();
  const [openScheduleModal, setOpenScheduleModal] = useState(false);
  const [mode, setMode] = useState<'new' | 'edit'>('new');
  const [selectedScheduleName, setSelectedScheduleName] = useState<string>('');

  const [dbType, k8sNamespace, schedules] = watch([
    DbWizardFormFields.dbType,
    DbWizardFormFields.k8sNamespace,
    DbWizardFormFields.schedules,
  ]);

  const createButtonDisabled =
    openScheduleModal ||
    (dbType === DbType.Postresql && schedules?.length >= 3);
  const [activeStorage, setActiveStorage] = useState(undefined);

  useEffect(() => {
    if (schedules?.length > 0 && dbType === DbType.Mongo) {
      setActiveStorage(schedules[0]?.backupStorageName);
    } else {
      setActiveStorage(undefined);
    }
  }, [schedules, dbType]);

  const handleDelete = (name: string) => {
    setValue(
      DbWizardFormFields.schedules,
      removeScheduleFromArray(name, schedules)
    );
  };
  const handleEdit = (name: string) => {
    setSelectedScheduleName(name);
    setMode('edit');
    setOpenScheduleModal(true);
  };
  const handleCreate = () => {
    setMode('new');
    setOpenScheduleModal(true);
  };

  const handleSubmit = (data: ScheduleFormData) => {
    const updatedSchedulesArray = getSchedulesPayload({
      formData: data,
      mode,
      schedules,
    });
    setValue(DbWizardFormFields.schedules, updatedSchedulesArray);
    setSelectedScheduleName('');
    setOpenScheduleModal(false);
  };

  const handleClose = () => {
    setOpenScheduleModal(false);
  };

  return (
    <>
      <LabeledContent
        label={Messages.label}
        actionButtonProps={{
          dataTestId: 'create-schedule',
          buttonText: 'Create backup schedule',
          disabled: createButtonDisabled,
          onClick: () => handleCreate(),
        }}
      >
        <Stack>
          {dbType === DbType.Mongo && (
            <Typography variant="caption">{Messages.mongoDb}</Typography>
          )}
          {dbType === DbType.Postresql && (
            <Typography variant="caption">{Messages.pg}</Typography>
          )}
          {schedules.map((item: Schedule) => (
            <EditableItem
              key={item.name}
              dataTestId={item.name}
              children={
                <ScheduleContent
                  schedule={item}
                  storageName={item.backupStorageName}
                />
              }
              onDelete={() => handleDelete(item.name)}
              onEdit={() => handleEdit(item.name)}
            />
          ))}
          {schedules.length === 0 && (
            <EditableItem
              dataTestId="empty"
              children={
                <Typography variant="body1">
                  You don’t have any backup schedules yet.
                </Typography>
              }
            />
          )}
        </Stack>
      </LabeledContent>
      {openScheduleModal && (
        <ScheduleFormDialogContext.Provider
          value={{
            mode,
            handleSubmit,
            handleClose,
            isPending: false,
            setMode,
            selectedScheduleName,
            setSelectedScheduleName,
            openScheduleModal,
            setOpenScheduleModal,
            dbClusterInfo: {
              schedules,
              namespace: k8sNamespace,
              dbEngine: dbTypeToDbEngine(dbType),
              activeStorage,
            },
          }}
        >
          <ScheduleFormDialog />
        </ScheduleFormDialogContext.Provider>
      )}
    </>
  );
};

export default Schedules;
