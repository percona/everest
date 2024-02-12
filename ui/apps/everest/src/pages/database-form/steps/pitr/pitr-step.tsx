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

import { Alert, Box, Typography } from '@mui/material';
import { DbType } from '@percona/types';
import { SwitchInput } from '@percona/ui-lib';
import { AutoCompleteAutoFill } from 'components/auto-complete-auto-fill/auto-complete-auto-fill';
import { Messages as StorageLocationMessages } from 'components/schedule-form/schedule-form.messages';
import { useBackupStorages } from 'hooks/api/backup-storages/useBackupStorages';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { DbWizardFormFields } from '../../database-form.types';
import { useDatabasePageMode } from '../../useDatabasePageMode';
import { StepHeader } from '../step-header/step-header';
import { Messages } from './pitr.messages';

const PITRStep = () => {
  const mode = useDatabasePageMode();
  const { control, watch, setValue } = useFormContext();
  const { data: backupStorages = [], isFetching } = useBackupStorages();
  // const { dbClusterData } = useDatabasePageDefaultValues(mode);
  const [
    pitrEnabled,
    backupsEnabled,
    pitrStorageLocation,
    dbType,
    storageLocation,
  ] = watch([
    DbWizardFormFields.pitrEnabled,
    DbWizardFormFields.backupsEnabled,
    DbWizardFormFields.pitrStorageLocation,
    DbWizardFormFields.dbType,
    DbWizardFormFields.storageLocation,
  ]);

  useEffect(() => {
    if (backupStorages?.length > 0) {
      if (mode === 'new') {
        setValue(DbWizardFormFields.pitrStorageLocation, {
          name: backupStorages[0].name,
        });
      }
      if (
        (mode === 'edit' || mode === 'restoreFromBackup') &&
        !pitrStorageLocation
      ) {
        setValue(DbWizardFormFields.pitrStorageLocation, {
          name: backupStorages[0].name,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupStorages, mode, pitrEnabled]);

  useEffect(() => {
    if (dbType === DbType.Postresql) {
      setValue(DbWizardFormFields.pitrEnabled, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbType]);

  const pitrDisabled = !backupsEnabled || dbType === DbType.Postresql;

  useEffect(() => {
    if (!backupsEnabled) {
      setValue(DbWizardFormFields.pitrEnabled, false);
    }

    if (pitrEnabled && dbType === DbType.Mongo && storageLocation) {
      setValue(DbWizardFormFields.pitrStorageLocation, storageLocation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupsEnabled]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <StepHeader
        pageTitle={Messages.header}
        pageDescription={Messages.description}
      />
      {dbType === DbType.Postresql && (
        <Alert severity="info" sx={{ mt: 1 }}>
          {Messages.unavailableForDb(dbType)}
        </Alert>
      )}
      {!backupsEnabled &&
        (dbType === DbType.Mysql || dbType === DbType.Mongo) && (
          <Alert severity="info" sx={{ mt: 1 }}>
            {Messages.toEnablePitr}
          </Alert>
        )}
      <SwitchInput
        control={control}
        label={Messages.enablePitr}
        name={DbWizardFormFields.pitrEnabled}
        switchFieldProps={{
          disabled: pitrDisabled,
        }}
        formControlLabelProps={{
          sx: { my: 1 },
        }}
      />
      {pitrEnabled && dbType === DbType.Mysql && (
        <AutoCompleteAutoFill
          name={DbWizardFormFields.pitrStorageLocation}
          label={StorageLocationMessages.storageLocation.label}
          loading={isFetching}
          options={backupStorages}
          isRequired
          enableFillFirst={mode === 'new'}
        />
      )}
      {pitrEnabled && dbType === DbType.Mongo && (
        <Typography variant="body1">
          {Messages.matchedStorageType(storageLocation.name)}
        </Typography>
      )}
    </Box>
  );
};

export default PITRStep;
