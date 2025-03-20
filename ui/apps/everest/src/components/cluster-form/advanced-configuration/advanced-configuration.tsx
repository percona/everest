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
  SwitchInput,
  TextArray,
  TextInput,
} from '@percona/ui-lib';
import { Messages } from './messages';
import { AdvancedConfigurationFields } from './advanced-configuration.types';
import { useFormContext } from 'react-hook-form';
import { DbType } from '@percona/types';
import { getParamsPlaceholderFromDbType } from './advanced-configuration.utils';
import { Stack } from '@mui/material';
import { useKubernetesClusterInfo } from 'hooks/api/kubernetesClusters/useKubernetesClusterInfo';
import { useEffect } from 'react';
import { DbWizardFormFields } from 'consts';
import { useDatabasePageMode } from 'pages/database-form/useDatabasePageMode';
import AdvancedCard from 'components/advanced-card';

interface AdvancedConfigurationFormProps {
  dbType: DbType;
  loadingDefaultsForEdition?: boolean;
}

export const AdvancedConfigurationForm = ({
  dbType,
  loadingDefaultsForEdition,
}: AdvancedConfigurationFormProps) => {
  const { watch, setValue, getFieldState } = useFormContext();
  const mode = useDatabasePageMode();
  const [externalAccess, engineParametersEnabled] = watch([
    AdvancedConfigurationFields.externalAccess,
    AdvancedConfigurationFields.engineParametersEnabled,
    AdvancedConfigurationFields.storageClass,
  ]);
  const { data: clusterInfo, isLoading: clusterInfoLoading } =
    useKubernetesClusterInfo(['wizard-k8-info']);

  // setting the storage class default value
  useEffect(() => {
    const { isTouched: storageClassTouched } = getFieldState(
      DbWizardFormFields.storageClass
    );

    if (
      !storageClassTouched &&
      mode === 'new' &&
      clusterInfo?.storageClassNames &&
      clusterInfo.storageClassNames.length > 0
    ) {
      setValue(
        DbWizardFormFields.storageClass,
        clusterInfo?.storageClassNames[0]
      );
    }
  }, [clusterInfo]);

  const handleBlur = (value: string, fieldName: string, hasError: boolean) => {
    if (!hasError && !value.includes('/') && value !== '') {
      setValue(fieldName, `${value}/32`, { shouldValidate: true });
    }
  };

  return (
    <>
      <AdvancedCard
        title={Messages.cards.storage.title}
        description={Messages.cards.storage.description}
        controlComponent={
          <AutoCompleteInput
            name={AdvancedConfigurationFields.storageClass}
            label={Messages.labels.storageClass}
            loading={clusterInfoLoading}
            options={clusterInfo?.storageClassNames || []}
            autoCompleteProps={{
              disableClearable: true,
              disabled: loadingDefaultsForEdition,
              sx: {
                mt: 0,
              },
            }}
          />
        }
      />
      <SwitchInput
        label={Messages.enableExternalAccess.title}
        labelCaption={Messages.enableExternalAccess.caption}
        name={AdvancedConfigurationFields.externalAccess}
      />
      {externalAccess && (
        <Stack sx={{ ml: 6 }} data-testid="external-access-fields">
          <TextArray
            placeholder={Messages.sourceRangePlaceholder}
            fieldName={AdvancedConfigurationFields.sourceRanges}
            fieldKey="sourceRange"
            label={Messages.sourceRange}
            handleBlur={handleBlur}
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
