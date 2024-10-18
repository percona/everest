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

import { useFormContext } from 'react-hook-form';
import { Messages } from './advanced-configurations.messages.ts';

import { DbWizardFormFields } from 'consts.ts';
import { StepHeader } from '../step-header/step-header.tsx';
import AdvancedConfigurationForm from 'components/cluster-form/advanced-configuration/advanced-configuration.tsx';
import { FormGroup } from '@mui/material';

export const AdvancedConfigurations = () => {
  const { watch } = useFormContext();
  const dbType = watch(DbWizardFormFields.dbType);

  return (
    <>
      <StepHeader pageTitle={Messages.advanced} />
      <FormGroup sx={{ mt: 3 }}>
        <AdvancedConfigurationForm dbType={dbType} />
      </FormGroup>
    </>
  );
};
