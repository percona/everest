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

import { Alert, Box } from '@mui/material';
import { SwitchInput } from '@percona/ui-lib';
import { useBackupStoragesByNamespace } from 'hooks/api/backup-storages/useBackupStorages';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { DbWizardFormFields } from '../../../database-form.types.ts';
import BackupsActionableAlert from 'components/actionable-alert/backups-actionable-alert';
import { useDatabasePageMode } from '../../../useDatabasePageMode.ts';
import { StepHeader } from '../step-header/step-header.tsx';
import { Messages } from './backups.messages.ts';
import Schedules from './schedules';

export const Backups = () => {
  const mode = useDatabasePageMode();
  const { control, watch, setValue, getFieldState, trigger } = useFormContext();

  const [backupsEnabled, dbType, selectedNamespace] = watch([
    DbWizardFormFields.backupsEnabled,
    DbWizardFormFields.dbType,
    DbWizardFormFields.k8sNamespace,
  ]);
  const { data: backupStorages = [] } =
    useBackupStoragesByNamespace(selectedNamespace);

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
      {backupsEnabled &&
        (backupStorages.length > 0 ? (
          <Schedules />
        ) : (
          <BackupsActionableAlert namespace={selectedNamespace} />
        ))}
      {!backupsEnabled && (
        <Alert
          sx={{ mt: 1 }}
          severity="info"
          data-testid="pitr-no-backup-alert"
        >
          {Messages.pitrAlert}
        </Alert>
      )}
    </Box>
  );
};
