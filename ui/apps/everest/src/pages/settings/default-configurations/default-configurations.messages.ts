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

import { SOURCE_RANGE_MESSAGE } from 'consts';

// limitations under the License.
export const Messages = {
  pageDescription:
    'Set up the default configurations for your future db-cluster to ensure consistent settings across your cluster.',
  cancel: 'Cancel',
  save: 'Save',
  monitoring: 'Monitoring',
  monitoringMessage:
    'Enable default monitoring for your db-cluster to spot critical performance issues faster and troubleshoot them more efficiently.',
  backups: 'Backups',
  backupsMessage:
    "Database backups are copies of a database's data and structures used to protect against data loss or corruption, allowing for restoration to a previous state if needed.",
  externalAccess: 'External Access',
  externalAccessMessage:
    'Enable external access by default for db-cluster that should be reachable outside the network cluster.',
  repeatsEvery: 'Repeats',
  sourceRangePlaceholder: SOURCE_RANGE_MESSAGE,
  addNew: 'Add new',
  errors: {
    invalidIP: SOURCE_RANGE_MESSAGE,
    required: 'Required field',
  },
};
