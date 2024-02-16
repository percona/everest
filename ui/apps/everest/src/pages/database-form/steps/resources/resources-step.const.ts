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
import { DbWizardFormFields } from '../../database-form.types';
import { ResourceSize } from './resources-step.types';

export const DEFAULT_SIZES = {
  [ResourceSize.small]: {
    [DbWizardFormFields.cpu]: 1,
    [DbWizardFormFields.memory]: 2,
    [DbWizardFormFields.disk]: 25,
  },
  [ResourceSize.medium]: {
    [DbWizardFormFields.cpu]: 4,
    [DbWizardFormFields.memory]: 8,
    [DbWizardFormFields.disk]: 100,
  },
  [ResourceSize.large]: {
    [DbWizardFormFields.cpu]: 8,
    [DbWizardFormFields.memory]: 32,
    [DbWizardFormFields.disk]: 200,
  },
};
