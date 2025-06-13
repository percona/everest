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

import { useContext } from 'react';
import { ScheduleModalContext } from '../backups.context.ts';
import { ScheduleFormData } from 'components/schedule-form-dialog/schedule-form/schedule-form-schema';
import { ScheduleFormDialogContext } from 'components/schedule-form-dialog/schedule-form-dialog-context/schedule-form-dialog.context';
import { ScheduleFormDialog } from 'components/schedule-form-dialog';
import { useUpdateDbClusterWithConflictRetry } from 'hooks';
import { backupScheduleFormValuesToDbClusterPayload } from 'components/schedule-form-dialog/schedule-form/schedule-form.utils.ts';
import { WizardMode } from 'shared-types/wizard.types.ts';
import { useLocation } from 'react-router-dom';

export const ScheduledBackupModal = () => {
  const location = useLocation();
  const cluster = location.state?.cluster || 'in-cluster';
  const {
    mode = WizardMode.New,
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

  const { mutate: updateCluster, isPending: updatingCluster } =
    useUpdateDbClusterWithConflictRetry(dbCluster!, cluster, {
      onSuccess: () => handleClose(),
    });

  const schedules = (dbCluster && dbCluster?.spec?.backup?.schedules) || [];

  const handleClose = () => {
    if (setOpenScheduleModal) {
      setOpenScheduleModal(false);
    }
  };

  const handleSubmit = (data: ScheduleFormData) => {
    updateCluster(
      backupScheduleFormValuesToDbClusterPayload(data, dbCluster, mode)
    );
  };

  return (
    <ScheduleFormDialogContext.Provider
      value={{
        mode,
        handleSubmit,
        handleClose,
        isPending: updatingCluster,
        setMode,
        selectedScheduleName,
        setSelectedScheduleName,
        openScheduleModal,
        setOpenScheduleModal,
        externalContext: 'db-details-backups',
        dbClusterInfo: {
          schedules,
          defaultSchedules: spec?.backup?.schedules,
          activeStorage: status?.activeStorage,
          namespace,
          dbEngine: spec?.engine?.type,
          dbClusterName,
        },
      }}
    >
      <ScheduleFormDialog />
    </ScheduleFormDialogContext.Provider>
  );
};
