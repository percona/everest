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
import { Messages } from './pitr.messages';
import { LabeledContent, SwitchInput } from '@percona/ui-lib';
import { DbType } from '@percona/types';
import { DbWizardFormFields } from '../../../../database-form.types';
import { useFormContext } from 'react-hook-form';
import PitrStorage from './pitr-storage';
import { useEffect } from 'react';

const PITR = () => {
  const { control, watch, setValue } = useFormContext();
  const [dbType, schedules] = watch([
    DbWizardFormFields.dbType,
    DbWizardFormFields.schedules,
  ]);

  const backupsEnabled = schedules?.length > 0;
  const pitrDisabled = !backupsEnabled || dbType === DbType.Postresql;

  useEffect(() => {
    if (dbType === DbType.Postresql && backupsEnabled) {
      setValue(DbWizardFormFields.pitrEnabled, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbType, backupsEnabled]);

  useEffect(() => {
    if (!backupsEnabled) {
      setValue(DbWizardFormFields.pitrEnabled, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupsEnabled]);

  useEffect(() => {
    if (dbType !== DbType.Mysql && schedules?.length > 0) {
      setValue(
        DbWizardFormFields.pitrStorageLocation,
        schedules[0]?.backupStorageName
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedules, dbType]);

  return (
    <Stack sx={{ mt: 7 }}>
      <LabeledContent label={Messages.sectionHeader} sx={{ mt: 0 }}>
        <Typography variant="body2">{Messages.description}</Typography>
        <SwitchInput
          control={control}
          label={Messages.enablePitr}
          labelCaption={Messages.pitrSwitchLabelCaption(
            dbType,
            schedules[0]?.backupStorageName || ''
          )}
          name={DbWizardFormFields.pitrEnabled}
          switchFieldProps={{
            disabled: pitrDisabled,
          }}
          formControlLabelProps={{
            sx: { my: 1 },
          }}
        />
        <PitrStorage />
      </LabeledContent>
    </Stack>
  );
};

export default PITR;
