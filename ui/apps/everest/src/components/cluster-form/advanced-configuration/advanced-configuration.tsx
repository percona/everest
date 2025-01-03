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

import { Box, Stack } from '@mui/material';
import { DbType } from '@percona/types';
import { SwitchInput, TextArray, TextInput } from '@percona/ui-lib';
import { AffinityListView } from 'components/cluster-form/affinity/affinity-list-view/affinity-list.view';
import { useFormContext } from 'react-hook-form';
import { AdvancedConfigurationFields } from './advanced-configuration.types';
import { getParamsPlaceholderFromDbType } from './advanced-configuration.utils';
import { Messages } from './messages';
import { DbWizardForm } from 'consts';
import { AffinityRule } from 'shared-types/affinity.types';
import { useCallback } from 'react';

interface AdvancedConfigurationFormProps {
  dbType: DbType;
  showAffinity?: boolean;
}

export const AdvancedConfigurationForm = ({
  dbType,
  showAffinity = false,
}: AdvancedConfigurationFormProps) => {
  const { watch, setValue } = useFormContext();

  const [
    externalAccess,
    engineParametersEnabled,
    formAffinityRules,
    isShardingEnabled,
  ] = watch([
    AdvancedConfigurationFields.externalAccess,
    AdvancedConfigurationFields.engineParametersEnabled,
    AdvancedConfigurationFields.affinityRules,
    DbWizardForm.sharding,
  ]);

  const onRulesChange = useCallback(
    (newRules: AffinityRule[]) => {
      setValue(AdvancedConfigurationFields.affinityRules, newRules, {
        shouldTouch: true,
        shouldDirty: true,
      });
    },
    [setValue]
  );

  return (
    <>
      {showAffinity && (
        <Box
          sx={{
            marginBottom: '15px',
            border: '1px solid #2C323E40',
            padding: '10px',
          }}
        >
          <AffinityListView
            initialRules={formAffinityRules}
            onRulesChange={onRulesChange}
            dbType={dbType}
            isShardingEnabled={isShardingEnabled}
          />
        </Box>
      )}
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
