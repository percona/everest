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

import { INVALID_SOURCE_RANGE_ERROR } from '../../consts';
import { errorMessages } from 'utils/common-validation';

export const Messages = {
  previous: 'Previous',
  continue: 'Continue',
  createDatabase: 'Create database',
  editDatabase: 'Edit database',
  cancel: 'Cancel',
  dialog: {
    title: 'Are you sure you want to cancel?',
    content:
      'Cancelling will discard all your current changes to this database.',
    reject: 'No',
    accept: 'Yes, cancel',
  },
  errors: {
    sourceRange: {
      invalid: INVALID_SOURCE_RANGE_ERROR,
    },
    engineParameters: {
      invalid: 'Invalid',
    },
    endpoint: {
      invalid: 'Invalid URL',
    },
    dbName: {
      tooLong: errorMessages.tooLong('database'),
    },
    storageClass: {
      invalid: 'Invalid storage class',
    },
    monitoringEndpoint: {
      invalidOption:
        'Invalid option. Please make sure you added a monitoring endpoint and select it from the dropdown',
    },
    sharding: {
      invalid: 'Please fill in valid values for sharding',
      min: (val: number) => `The value cannot be less than ${val}`,
      odd: 'The value cannot be even',
    },
  },
};
