// percona-everest-frontend
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
import {
  DB_CLUSTER_QUERY,
  useDbCluster,
} from 'hooks/api/db-cluster/useDbCluster';
import { useContext, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Messages } from './scheduled-backup-modal.messages';

import {
  ScheduleFormData,
  schema,
} from 'components/schedule-form/schedule-form-schema.ts';
import { useUpdateSchedules } from 'hooks/api/backups/useScheduledBackups';
import { ScheduleModalContext } from '../backups.context.ts';
import { ScheduledBackupModalForm } from './scheduled-backup-modal-form/scheduled-backup-modal-form';
import { scheduleModalDefaultValues } from './scheduled-backup-modal-utils';

export const ScheduledBackupModal = () => {
  const queryClient = useQueryClient();
  const { dbClusterName, namespace = '' } = useParams();
  const {
    mode = 'new',
    selectedScheduleName,
    openScheduleModal,
    setOpenScheduleModal,
  } = useContext(ScheduleModalContext);

  const { data: dbCluster } = useDbCluster(dbClusterName!, namespace, {
    enabled: !!dbClusterName && mode === 'edit',
  });

  const { mutate: updateScheduledBackup, isPending } = useUpdateSchedules(
    dbClusterName!,
    namespace,
    mode
  );

  const schedules = (dbCluster && dbCluster?.spec?.backup?.schedules) || [];
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

  const handleCloseScheduledBackupModal = () => {
    if (setOpenScheduleModal) {
      setOpenScheduleModal(false);
    }
  };

  const handleSubmit = (data: ScheduleFormData) => {
    updateScheduledBackup(data, {
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: [DB_CLUSTER_QUERY, dbClusterName],
        });
        handleCloseScheduledBackupModal();
      },
    });
  };

  const values = useMemo(
    () => scheduleModalDefaultValues(mode, selectedSchedule),
    [mode, selectedSchedule]
  );

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
      {...(mode === 'new' && { subHead2: Messages.createSchedule.subhead })}
      size="XXL"
      dataTestId={`${mode}-scheduled-backup`}
    >
      <ScheduledBackupModalForm />
    </FormDialog>
  );
};
