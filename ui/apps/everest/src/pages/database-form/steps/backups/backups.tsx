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

import { Alert, Box } from '@mui/material';
import { SwitchInput } from '@percona/ui-lib';
import { useBackupStoragesByNamespace } from 'hooks/api/backup-storages/useBackupStorages';
import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { DbWizardFormFields, StepProps } from '../../database-form.types';
import BackupsActionableAlert from 'components/actionable-alert/backups-actionable-alert';
import { useDatabasePageDefaultValues } from '../../useDatabaseFormDefaultValues.ts';
import { useDatabasePageMode } from '../../useDatabasePageMode.ts';
import { StepHeader } from '../step-header/step-header.tsx';
import { Messages } from './backups.messages.ts';
import { ScheduleBackupSection } from './schedule-section/schedule-section.tsx';

export const Backups = ({ alreadyVisited }: StepProps) => {
  const mode = useDatabasePageMode();
  const { control, watch, setValue, getFieldState, trigger } = useFormContext();
  const { dbClusterData } = useDatabasePageDefaultValues(mode);

  const [backupsEnabled, dbType, selectedNamespace] = watch([
    DbWizardFormFields.backupsEnabled,
    DbWizardFormFields.dbType,
    DbWizardFormFields.k8sNamespace,
  ]);
  const { data: backupStorages = [] } =
    useBackupStoragesByNamespace(selectedNamespace);

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
