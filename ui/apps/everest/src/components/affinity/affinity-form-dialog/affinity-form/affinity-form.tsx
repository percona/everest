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

import { ArrowOutward } from '@mui/icons-material';
import { Box, Button, MenuItem, Typography } from '@mui/material';
import {
  SelectInput,
  TextInput,
  ToggleButtonGroupInput,
  ToggleCard,
} from '@percona/ui-lib';
import { useContext } from 'react';
import {
  AffinityComponentValue,
  AffinityOperator,
  AffinityOperatorValue,
  AffinityPriority,
  AffinityPriorityValue,
  AffinityType,
  AffinityTypeValue,
} from '../../../cluster-form/advanced-configuration/advanced-configuration.types';
import { Messages } from '../../../cluster-form/advanced-configuration/affinity/affinity-form.messages';
import { AffinityFormDialogContext } from '../affinity-form-dialog-context/affinity-form-context';
import { AffinityFormFields } from './affinity-form.types';
import { availableComponentsType } from 'components/affinity/affinity-utils';
import { useFormContext } from 'react-hook-form';

export const AffinityForm = () => {
  const {
    mode = 'new',
    dbType,
    isShardingEnabled,
  } = useContext(AffinityFormDialogContext);
  const { watch } = useFormContext();
  const [operator, key, priority] = watch([
    AffinityFormFields.operator,
    AffinityFormFields.key,
    AffinityFormFields.priority,
  ]);

  return (
    <>
      <Box sx={{ display: 'flex' }}>
        <Typography variant="body2">
          {Messages.description}
          <Button
            data-testid="learn-more-button"
            size="small"
            sx={{ fontWeight: '600', paddingTop: 0 }}
            onClick={() => {
              window.open(
                'https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity',
                '_blank',
                'noopener'
              );
            }}
            endIcon={<ArrowOutward />}
          >
            {Messages.learnMore}
          </Button>
        </Typography>
      </Box>

      <Typography variant="sectionHeading" sx={{ marginTop: '20px' }}>
        {Messages.ruleType}
      </Typography>
      <Box sx={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <SelectInput
          name={AffinityFormFields.component}
          label={Messages.component}
          selectFieldProps={{
            label: Messages.component,
            sx: { width: '213px' },
            disabled: mode === 'edit',
          }}
          data-testid="component-select"
        >
          {availableComponentsType(dbType, isShardingEnabled).map((value) => (
            <MenuItem key={value} value={value} data-testid={value}>
              {AffinityComponentValue[value]}
            </MenuItem>
          ))}
        </SelectInput>

        <SelectInput
          name={AffinityFormFields.type}
          label={Messages.type}
          selectFieldProps={{ sx: { width: '213px' }, label: Messages.type }}
          data-testid="type-select"
        >
          {Object.values(AffinityType).map((value) => (
            <MenuItem key={value} value={value} data-testid={value}>
              {AffinityTypeValue[value]}
            </MenuItem>
          ))}
        </SelectInput>

        <ToggleButtonGroupInput // TODO needs extra styling to look like FIGMA
          name={AffinityFormFields.priority}
          toggleButtonGroupProps={{
            size: 'small',
            sx: { height: '30px', width: '160px', marginTop: '20px' },
          }}
        >
          {Object.values(AffinityPriority).map((value) => (
            <ToggleCard
              sx={{ borderRadius: '15px' }}
              value={value}
              data-testid={`toggle-button-${value}`}
              key={value}
            >
              {AffinityPriorityValue[value]}
            </ToggleCard>
          ))}
        </ToggleButtonGroupInput>
      </Box>
      {priority === AffinityPriority.Preferred && (
        <TextInput
          name={AffinityFormFields.weight}
          textFieldProps={{
            helperText: '0 - 100',
            type: 'number',
            sx: {
              width: '213px',
              marginTop: '25px',
            },
          }}
          label={Messages.weight}
        />
      )}
      <Typography variant="sectionHeading" sx={{ marginTop: '20px' }}>
        {Messages.ruleDetails}
      </Typography>
      <Box sx={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <TextInput
          name={AffinityFormFields.topologyKey}
          label={Messages.topologyKey}
        />
        <TextInput name={AffinityFormFields.key} label={Messages.key} />
        <SelectInput
          name={AffinityFormFields.operator}
          label={Messages.operator}
          selectFieldProps={{
            sx: { width: '213px' },
            label: Messages.operator,
            disabled: !key,
          }}
          data-testid="operator-select"
        >
          {Object.values(AffinityOperator).map((value) => (
            <MenuItem key={value} value={value} data-testid={value}>
              {AffinityOperatorValue[value]}
            </MenuItem>
          ))}
        </SelectInput>
      </Box>
      {[AffinityOperator.In, AffinityOperator.NotIn].includes(operator) && (
        <TextInput
          name={AffinityFormFields.values}
          label={Messages.values}
          textFieldProps={{
            sx: {
              marginTop: '25px',
              width: '645px',
            },
            inputProps: {
              disabled: !key,
            },
            helperText: 'Insert comma seperated values',
          }}
        />
      )}
    </>
  );
};
