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

import {
  AutoCompleteInput,
  SelectInput,
  SwitchInput,
  TextArray,
  TextInput,
} from '@percona/ui-lib';
import { Messages } from './messages';
import { AdvancedConfigurationFields } from './advanced-configuration.types';
import { useFormContext } from 'react-hook-form';
import { DbType } from '@percona/types';
import { getParamsPlaceholderFromDbType } from './advanced-configuration.utils';
import {
  Box,
  FormGroup,
  IconButton,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useKubernetesClusterInfo } from 'hooks/api/kubernetesClusters/useKubernetesClusterInfo';
import { useEffect, useRef, useState } from 'react';
import { DbWizardFormFields } from 'consts';
import AdvancedCard from 'components/advanced-card';
import { usePodSchedulingPolicies } from 'hooks';
import PoliciesDialog from './policies.dialog';
import { PodSchedulingPolicy } from 'shared-types/affinity.types';
import { dbTypeToDbEngine } from '@percona/utils';

interface AdvancedConfigurationFormProps {
  dbType: DbType;
  loadingDefaultsForEdition?: boolean;
  setDefaultsOnLoad?: boolean;
  allowStorageClassChange?: boolean;
}

export const AdvancedConfigurationForm = ({
  dbType,
  loadingDefaultsForEdition,
  setDefaultsOnLoad = false,
  allowStorageClassChange = false,
}: AdvancedConfigurationFormProps) => {
  const { watch, setValue, getFieldState, getValues } = useFormContext();
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const selectedPolicy = useRef<PodSchedulingPolicy>();
  const [externalAccess, engineParametersEnabled, policiesEnabled] = watch([
    AdvancedConfigurationFields.externalAccess,
    AdvancedConfigurationFields.engineParametersEnabled,
    AdvancedConfigurationFields.podSchedulingPolicyEnabled,
  ]);
  const { data: clusterInfo, isLoading: clusterInfoLoading } =
    useKubernetesClusterInfo(['wizard-k8-info']);
  const { data: policies = [], isLoading: fetchingPolicies } =
    usePodSchedulingPolicies(dbTypeToDbEngine(dbType), {
      refetchInterval: 2000,
    });

  const handleOnPolicyInfoClick = () => {
    const policyName = getValues<string>(
      AdvancedConfigurationFields.podSchedulingPolicy
    );
    selectedPolicy.current = policies.find(
      (p) => policyName === p.metadata.name
    );

    if (selectedPolicy.current) {
      setPolicyDialogOpen(true);
    }
  };

  // setting the storage class default value
  useEffect(() => {
    const { isTouched: storageClassTouched } = getFieldState(
      DbWizardFormFields.storageClass
    );

    if (
      setDefaultsOnLoad &&
      allowStorageClassChange &&
      !storageClassTouched &&
      clusterInfo?.storageClassNames &&
      clusterInfo.storageClassNames.length > 0
    ) {
      setValue(
        DbWizardFormFields.storageClass,
        clusterInfo?.storageClassNames[0],
        { shouldValidate: true }
      );
    }
  }, [clusterInfo, setDefaultsOnLoad, allowStorageClassChange]);

  useEffect(() => {
    if (setDefaultsOnLoad && policies.length) {
      setValue(
        AdvancedConfigurationFields.podSchedulingPolicy,
        policies[0].metadata.name
      );
    }
  }, [policies, setValue, setDefaultsOnLoad]);

  const handleBlur = (value: string, fieldName: string, hasError: boolean) => {
    if (!hasError && !value.includes('/') && value !== '') {
      setValue(fieldName, `${value}/32`);
    }
  };

  return (
    <FormGroup
      sx={{
        mt: 3,
        '& > .percona-rounded-box:not(:last-child)': {
          mb: 2,
        },
      }}
    >
      <AdvancedCard
        title={Messages.cards.storage.title}
        description={Messages.cards.storage.description}
        controlComponent={
          <AutoCompleteInput
            name={AdvancedConfigurationFields.storageClass}
            loading={clusterInfoLoading}
            options={clusterInfo?.storageClassNames || []}
            disabled={!allowStorageClassChange || loadingDefaultsForEdition}
            textFieldProps={{
              placeholder: Messages.placeholders.storageClass,
            }}
            tooltipText={
              allowStorageClassChange
                ? undefined
                : Messages.tooltipTexts.storageClass
            }
            autoCompleteProps={{
              sx: {
                mt: 0,
              },
            }}
          />
        }
      />
      <AdvancedCard
        title={Messages.cards.policies.title}
        description={
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="top"
            minHeight={'50px'}
          >
            <Typography variant="caption" maxWidth="60%">
              {Messages.cards.policies.description}
            </Typography>
            {!!policiesEnabled && (
              <Box display="flex" ml="auto" alignItems="center">
                <SelectInput
                  name={AdvancedConfigurationFields.podSchedulingPolicy}
                  loading={fetchingPolicies || loadingDefaultsForEdition}
                  formControlProps={{
                    sx: {
                      minWidth: '200px',
                      mt: 0,
                    },
                  }}
                >
                  {policies.map((policy) => (
                    <MenuItem
                      value={policy.metadata.name}
                      key={policy.metadata.name}
                    >
                      {policy.metadata.name}
                    </MenuItem>
                  ))}
                </SelectInput>
                {!!policies.length && (
                  <IconButton onClick={handleOnPolicyInfoClick}>
                    <InfoIcon sx={{ width: '20px' }} />
                  </IconButton>
                )}
              </Box>
            )}
          </Box>
        }
        controlComponent={
          <SwitchInput
            label={Messages.enable}
            name={AdvancedConfigurationFields.podSchedulingPolicyEnabled}
          />
        }
      />
      <AdvancedCard
        title={Messages.cards.enableExternalAccess.title}
        description={
          <Stack>
            <Typography variant="caption">
              {Messages.cards.enableExternalAccess.description}
            </Typography>
            {externalAccess && (
              <Stack>
                <TextArray
                  placeholder={Messages.sourceRangePlaceholder}
                  fieldName={AdvancedConfigurationFields.sourceRanges}
                  fieldKey="sourceRange"
                  label={Messages.sourceRange}
                  handleBlur={handleBlur}
                />
              </Stack>
            )}
          </Stack>
        }
        controlComponent={
          <SwitchInput
            label={Messages.enable}
            name={AdvancedConfigurationFields.externalAccess}
          />
        }
      />
      <AdvancedCard
        title={Messages.cards.engineParameters.title}
        description={
          <Stack>
            <Typography variant="caption">
              {Messages.cards.engineParameters.description}
            </Typography>
            {engineParametersEnabled && (
              <TextInput
                name={AdvancedConfigurationFields.engineParameters}
                textFieldProps={{
                  placeholder: getParamsPlaceholderFromDbType(dbType),
                  multiline: true,
                  minRows: 3,
                }}
              />
            )}
          </Stack>
        }
        controlComponent={
          <SwitchInput
            label={Messages.enable}
            name={AdvancedConfigurationFields.engineParametersEnabled}
          />
        }
      />
      {policyDialogOpen && (
        <PoliciesDialog
          engineType={selectedPolicy.current!.spec.engineType}
          policy={selectedPolicy.current!}
          handleClose={() => setPolicyDialogOpen(false)}
        />
      )}
    </FormGroup>
  );
};

export default AdvancedConfigurationForm;
