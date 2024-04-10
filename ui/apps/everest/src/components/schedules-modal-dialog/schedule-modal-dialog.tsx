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

import { FormDialog } from 'components/form-dialog';
import { useMemo } from 'react';
import { Messages } from './schedule-modal-dialog.messages';

import { schema } from 'components/schedule-form/schedule-form-schema.ts';
import { scheduleModalDefaultValues } from './schedule-modal-dialog.utils';
import { Typography } from '@mui/material';
import { ScheduledBackupModalForm } from '../../pages/db-cluster-details/backups/scheduled-backup-modal/scheduled-backup-modal-form/scheduled-backup-modal-form';
import { ScheduledModalDialogProps } from './schedule-modal-dialog.types';

export const ScheduledModalDialog = ({
  mode,
  namespace,
  openScheduleModal,
  handleCloseScheduledBackupModal,
  handleSubmit,
  isPending,
  schedules,
  selectedScheduleName,
  setSelectedScheduleName,
  dbEngineType,
}: ScheduledModalDialogProps) => {
  const schedulesNamesList = schedules.map((item) => item?.name);

  const scheduledBackupSchema = useMemo(
    () => schema(schedulesNamesList, mode),
    [schedulesNamesList, mode]
  );

  const selectedSchedule = useMemo(() => {
    if (mode === 'edit') {
      return schedules.find((item) => item?.name === selectedScheduleName);
    }
  }, [mode, schedules, selectedScheduleName]);

  const values = useMemo(() => {
    return scheduleModalDefaultValues(mode, selectedSchedule);
  }, [mode, selectedSchedule]);

  return (
    <FormDialog
      isOpen={!!openScheduleModal}
      closeModal={handleCloseScheduledBackupModal}
      headerMessage={
        mode === 'new'
          ? Messages.createSchedule.headerMessage
          : Messages.editSchedule.headerMessage
      }
      onSubmit={handleSubmit}
      submitting={isPending}
      submitMessage={
        mode === 'new'
          ? Messages.createSchedule.submitMessage
          : Messages.editSchedule.submitMessage
      }
      schema={scheduledBackupSchema}
      {...(mode === 'edit' && { values })}
      defaultValues={values}
      size="XXL"
      dataTestId={`${mode}-scheduled-backup`}
    >
      {mode === 'new' && (
        <Typography variant="body1" mb={3}>
          {Messages.createSchedule.subhead}
        </Typography>
      )}
      <ScheduledBackupModalForm
        namespace={namespace}
        schedules={schedules}
        mode={mode}
        setSelectedScheduleName={setSelectedScheduleName}
        dbEngineType={dbEngineType}
      />
    </FormDialog>
  );
};
