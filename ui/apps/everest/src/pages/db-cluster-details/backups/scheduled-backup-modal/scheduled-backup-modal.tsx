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

import { DB_CLUSTER_QUERY } from 'hooks/api/db-cluster/useDbCluster';
import { useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useUpdateSchedules } from 'hooks/api/backups/useScheduledBackups';
import { ScheduleModalContext } from '../backups.context.ts';
import { ScheduleFormData } from 'components/schedule-form/schedule-form-schema';
import { ScheduleFormDialogContext } from 'components/schedule-form-dialog/schedule-form-dialog-context/schedule-form-dialog.context';
import { ScheduleFormDialog } from 'components/schedule-form-dialog';

export const ScheduledBackupModal = () => {
  const queryClient = useQueryClient();
  const {
    mode = 'new',
    setMode,
    selectedScheduleName,
    openScheduleModal,
    setOpenScheduleModal,
    setSelectedScheduleName,
    dbCluster,
  } = useContext(ScheduleModalContext);

  const {
    metadata: { name: dbClusterName, namespace },
    status,
    spec,
  } = dbCluster;

  const { mutate: updateScheduledBackup, isPending } = useUpdateSchedules(
    dbClusterName,
    namespace,
    mode
  );

  const schedules = (dbCluster && dbCluster?.spec?.backup?.schedules) || [];

  const handleClose = () => {
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
        handleClose();
      },
    });
  };

  return (
    <ScheduleFormDialogContext.Provider
      value={{
        mode,
        handleSubmit,
        handleClose,
        isPending,
        setMode,
        selectedScheduleName,
        setSelectedScheduleName,
        openScheduleModal,
        setOpenScheduleModal,
        dbClusterInfo: {
          schedules,
          activeStorage: status?.activeStorage,
          namespace,
          dbEngine: spec?.engine?.type,
        },
      }}
    >
      <ScheduleFormDialog />
    </ScheduleFormDialogContext.Provider>
  );
};
