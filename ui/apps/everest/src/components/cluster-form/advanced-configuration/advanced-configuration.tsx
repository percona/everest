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

import { SwitchInput, TextArray, TextInput } from '@percona/ui-lib';
import { Messages } from './messages';
import { AdvancedConfigurationFields } from './advanced-configuration.types';
import { useFormContext } from 'react-hook-form';
import { DbType } from '@percona/types';
import { getParamsPlaceholderFromDbType } from './advanced-configuration.utils';
import { Stack } from '@mui/material';

interface AdvancedConfigurationFormProps {
  dbType: DbType;
}

export const AdvancedConfigurationForm = ({
  dbType,
}: AdvancedConfigurationFormProps) => {
  const { watch } = useFormContext();
  const [externalAccess, engineParametersEnabled] = watch([
    AdvancedConfigurationFields.externalAccess,
    AdvancedConfigurationFields.engineParametersEnabled,
  ]);

  return (
    <>
      <SwitchInput
        label={Messages.enableExternalAccess.title}
        labelCaption={Messages.enableExternalAccess.caption}
        name={AdvancedConfigurationFields.externalAccess}
      />
      {externalAccess && (
        <Stack sx={{ ml: 6 }}>
          <TextArray
            placeholder={Messages.sourceRangePlaceholder}
            fieldName={AdvancedConfigurationFields.sourceRanges}
            fieldKey="sourceRange"
            label={Messages.sourceRange}
          />
        </Stack>
      )}
      <SwitchInput
        label={Messages.engineParameters.title}
        labelCaption={Messages.engineParameters.caption}
        name={AdvancedConfigurationFields.engineParametersEnabled}
        formControlLabelProps={{
          sx: {
            mt: 1,
          },
        }}
      />
      {engineParametersEnabled && (
        <TextInput
          name={AdvancedConfigurationFields.engineParameters}
          textFieldProps={{
            placeholder: getParamsPlaceholderFromDbType(dbType),
            multiline: true,
            minRows: 3,
            sx: {
              ml: 6,
            },
          }}
        />
      )}
    </>
  );
};

export default AdvancedConfigurationForm;
