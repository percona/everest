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
  Tooltip,
  Typography,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/InfoOutlined';
import { useKubernetesClusterInfo } from 'hooks/api/kubernetesClusters/useKubernetesClusterInfo';
import { useEffect, useRef, useState } from 'react';
import { DbWizardFormFields, EVEREST_READ_ONLY_FINALIZER } from 'consts';
import { FormCard } from 'components/form-card';
import { usePodSchedulingPolicies } from 'hooks';
import PoliciesDialog from './policies.dialog';
import { PodSchedulingPolicy } from 'shared-types/affinity.types';
import { dbTypeToDbEngine } from '@percona/utils';
import { SELECT_WIDTH } from './constants';

interface AdvancedConfigurationFormProps {
  dbType: DbType;
  loadingDefaultsForEdition?: boolean;
  setDefaultsOnLoad?: boolean;
  automaticallyTogglePodSchedulingPolicySwitch?: boolean;
  allowStorageClassChange?: boolean;
}

export const AdvancedConfigurationForm = ({
  dbType,
  loadingDefaultsForEdition,
  setDefaultsOnLoad = false,
  automaticallyTogglePodSchedulingPolicySwitch = false,
  allowStorageClassChange = false,
}: AdvancedConfigurationFormProps) => {
  const { watch, setValue, getFieldState, getValues, trigger } =
    useFormContext();
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
    usePodSchedulingPolicies(dbTypeToDbEngine(dbType), true, {
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

  const revalidateSourceRanges = () => {
    const sourceRanges = getValues(AdvancedConfigurationFields.sourceRanges);
    // @ts-ignore
    sourceRanges.forEach((range, i) => {
      if (range.sourceRange) {
        trigger(`${AdvancedConfigurationFields.sourceRanges}.${i}.sourceRange`);
      }
    });
  };

  // setting the storage class default value
  useEffect(() => {
    const { isTouched: storageClassTouched } = getFieldState(
      DbWizardFormFields.storageClass
    );

    revalidateSourceRanges();

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
    if (!policies.length) {
      return;
    }

    const { isTouched: policyTouched } = getFieldState(
      DbWizardFormFields.podSchedulingPolicy
    );

    const { isTouched: policyEnabledTouched } = getFieldState(
      DbWizardFormFields.podSchedulingPolicyEnabled
    );

    const defaultPolicy = policies.find((policy) =>
      policy.metadata.finalizers.includes(EVEREST_READ_ONLY_FINALIZER)
    );

    if (setDefaultsOnLoad && !policyTouched) {
      setValue(
        AdvancedConfigurationFields.podSchedulingPolicy,
        defaultPolicy ? defaultPolicy.metadata.name : policies[0].metadata.name
      );
    }

    if (
      defaultPolicy &&
      automaticallyTogglePodSchedulingPolicySwitch &&
      !policyEnabledTouched
    ) {
      setValue(AdvancedConfigurationFields.podSchedulingPolicyEnabled, true);
    }
  }, [
    policies,
    setValue,
    setDefaultsOnLoad,
    automaticallyTogglePodSchedulingPolicySwitch,
  ]);

  const handleBlur = (value: string, fieldName: string, hasError: boolean) => {
    if (!hasError && !value.includes('/') && value !== '') {
      setValue(fieldName, `${value}/32`, { shouldValidate: true });
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
      <FormCard
        title={Messages.cards.storage.title}
        description={
          !loadingDefaultsForEdition ? Messages.cards.storage.description : ''
        }
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
              disableClearable: true,
              sx: {
                width: SELECT_WIDTH,
                mt: 0,
              },
            }}
          />
        }
      />
      <FormCard
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
                      width: SELECT_WIDTH,
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
          <Tooltip
            title={!policies?.length ? Messages.tooltipTexts.noPolicies : ''}
            placement="top"
            arrow
          >
            <span>
              <SwitchInput
                label={Messages.enable}
                name={AdvancedConfigurationFields.podSchedulingPolicyEnabled}
                switchFieldProps={{
                  disabled: !policies?.length,
                }}
              />
            </span>
          </Tooltip>
        }
      />
      <FormCard
        title={Messages.cards.enableExternalAccess.title}
        description={
          <Stack>
            <Typography variant="caption">
              {Messages.cards.enableExternalAccess.description}
            </Typography>
            {externalAccess && (
              <Stack sx={{ ml: 6 }} data-testid="external-access-fields">
                <TextArray
                  placeholder={Messages.sourceRangePlaceholder}
                  fieldName={AdvancedConfigurationFields.sourceRanges}
                  fieldKey="sourceRange"
                  label={Messages.sourceRange}
                  handleBlur={handleBlur}
                  onRemove={revalidateSourceRanges}
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
      <FormCard
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
