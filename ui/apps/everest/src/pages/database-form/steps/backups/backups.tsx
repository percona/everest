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

import { Alert, Box, Button } from '@mui/material';
import { DbType } from '@percona/types';
import { SwitchInput } from '@percona/ui-lib';
import {
  BACKUP_STORAGES_QUERY_KEY,
  useBackupStorages,
  useCreateBackupStorage,
} from 'hooks/api/backup-storages/useBackupStorages';
import { CreateEditModalStorage } from 'pages/settings/storage-locations/createEditModal/create-edit-modal.tsx';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import { BackupStorage } from 'shared-types/backupStorages.types.ts';
import { updateDataAfterCreate } from 'utils/generalOptimisticDataUpdate.ts';
import { DbWizardFormFields, StepProps } from '../../database-form.types';
import { useDatabasePageDefaultValues } from '../../useDatabaseFormDefaultValues.ts';
import { useDatabasePageMode } from '../../useDatabasePageMode.ts';
import { StepHeader } from '../step-header/step-header.tsx';
import { Messages } from './backups.messages.ts';
import { ScheduleBackupSection } from './schedule-section/schedule-section.tsx';

export const Backups = ({ alreadyVisited }: StepProps) => {
  const queryClient = useQueryClient();
  const { mutate: createBackupStorage, isLoading: creatingBackupStorage } =
    useCreateBackupStorage();
  const [openCreateEditModal, setOpenCreateEditModal] = useState(false);
  const mode = useDatabasePageMode();
  const { control, watch, setValue, getFieldState, trigger } = useFormContext();
  const { dbClusterData } = useDatabasePageDefaultValues(mode);
  const { data: backupStorages = [] } = useBackupStorages();
  const [backupsEnabled, dbType] = watch([
    DbWizardFormFields.backupsEnabled,
    DbWizardFormFields.dbType,
  ]);

  // TODO should be removed after https://jira.percona.com/browse/EVEREST-509 + DEFAULT_VALUES should be changed from false to true for all databases
  useEffect(() => {
    const { isTouched } = getFieldState(DbWizardFormFields.backupsEnabled);

    if (isTouched) {
      return;
    }

    if (mode === 'new' || mode === 'restoreFromBackup') {
      setValue(DbWizardFormFields.backupsEnabled, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbType]);

  // const pitrEnabled: boolean = watch(DbWizardFormFields.pitrEnabled);

  const schedules =
    mode === 'new' ? [] : dbClusterData?.spec?.backup?.schedules || [];
  const multiSchedules =
    mode === 'edit' && !!schedules && schedules?.length > 1;
  const scheduleDisabled = multiSchedules;

  const handleSubmit = (_: boolean, data: BackupStorage) => {
    handleCreateBackup(data);
  };

  const handleCreateBackup = (data: BackupStorage) => {
    createBackupStorage(data, {
      onSuccess: (newLocation) => {
        updateDataAfterCreate(
          queryClient,
          BACKUP_STORAGES_QUERY_KEY
        )(newLocation);
        handleCloseModal();
      },
    });
  };

  const handleCloseModal = () => {
    setOpenCreateEditModal(false);
  };

  useEffect(() => {
    trigger();
  }, [backupsEnabled]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <StepHeader
        pageTitle={Messages.backups}
        pageDescription={Messages.captionBackups}
      />
      <SwitchInput
        control={control}
        label={Messages.enableBackups}
        name={DbWizardFormFields.backupsEnabled}
        formControlLabelProps={{
          sx: { mt: 1 },
        }}
      />
      {backupsEnabled && backupStorages.length === 0 && (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setOpenCreateEditModal(true)}
            >
              {Messages.addStorage}
            </Button>
          }
        >
          {Messages.noStoragesMessage}
        </Alert>
      )}
      {backupsEnabled && backupStorages.length > 0 && (
        <>
          {(mode === 'new' || mode === 'restoreFromBackup') && (
            <Alert sx={{ mt: 1 }} severity="info">
              {Messages.youCanAddMoreSchedules}
            </Alert>
          )}
          {multiSchedules && (
            <Alert sx={{ mt: 1 }} severity="info">
              {Messages.youHaveMultipleSchedules}
            </Alert>
          )}
          {!scheduleDisabled && (
            <ScheduleBackupSection enableNameGeneration={!alreadyVisited} />
          )}
        </>
      )}
      {!backupsEnabled && dbType === DbType.Mysql && (
        <Alert
          sx={{ mt: 1 }}
          severity="info"
          data-testid="pitr-no-backup-alert"
        >
          {dbType === DbType.Mysql && Messages.pitrAlert}
        </Alert>
      )}
      {openCreateEditModal && (
        <CreateEditModalStorage
          open={openCreateEditModal}
          handleCloseModal={handleCloseModal}
          handleSubmitModal={handleSubmit}
          isLoading={creatingBackupStorage}
        />
      )}
    </Box>
  );
};
