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
export const Messages = {
  backups: 'Backups',
  captionBackups:
    'Specify how often you want to run backup jobs for your database.',
  enableBackups: 'Enable backups',
  storageLocation: 'Storage location',
  repeatsEvery: 'Repeats',
  youCanAddMoreSchedules:
    'After creating the database, you can add more schedules from the Backups section in the DB cluster details view.',
  youHaveMultipleSchedules:
    'You have multiple backup schedules set for this database. See the list of schedules and update the ones you need straight from the Backups section in the DB cluster details view.',
  // TODO Temporary message. Should be deleted after https://jira.percona.com/browse/EVEREST-509
  schedulesUnavailableForPostgreSQL:
    'Scheduled backups are currently unavailable for PostgreSQL databases. You can still enable on-demand backups from the Backups page in the database cluster view.',
  pitrAlert:
    'Point-in-time-recovery (PITR) relies on an active backup schedule. If you don’t configure a backup schedule now, PITR will be disabled in the next step of the wizard.',
  addStorage: 'Add storage',
  noStoragesMessage:
    'To continue with enabled backups, you need to add a backup storage first. Disable backups to proceed without them.',
};
