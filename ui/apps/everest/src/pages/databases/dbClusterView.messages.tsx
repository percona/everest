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
  createDatabase: 'Create database',
  statusProvider: {
    up: 'Up',
    down: 'Down',
    initializing: 'Initializing',
    pausing: 'Pausing',
    stopping: 'Stopping',
    paused: 'Paused',
    unknown: 'Unknown',
    restoring: 'Restoring',
    deleting: 'Deleting',
  },
  lastBackup: {
    warningTooltip: 'Check your backups page for more info',
    inactive: 'Inactive',
    scheduled: 'Scheduled',
    pending: 'Pending',
    notStarted: 'Not Started',
    seconds: 'sec',
    minutes: 'min',
    hours: 'h',
    days: 'd',
    ago: 'ago',
  },
  expandedRow: {
    connection: 'Connection',
    dbClusterParams: 'DB Cluster parameters',
    k8sCluster: 'K8s Cluster Name',
    cpu: 'CPU',
    memory: 'Memory',
    disk: 'Disk',
    nodes: 'Number of nodes',
    externalAccess: 'External Access',
    monitoring: 'Monitoring',
    enabled: 'Enabled',
    disabled: 'Disabled',
  },
  menuItems: {
    edit: 'Edit',
    delete: 'Delete',
    restart: 'Restart',
    suspend: 'Suspend',
    resume: 'Resume',
    restoreFromBackup: 'Restore from a backup',
    createNewDbFromBackup: 'Create DB from a backup',
  },
  dbCluster: {
    noData: "You don't have any databases yet. Create one to get started.",
  },
  deleteModal: {
    header: 'Delete database',
    content: (dbName: string) => (
      <>
        Are you sure you want to permanently delete <b>{dbName}</b>? To confirm
        this action, type the name of your database.
      </>
    ),
    databaseName: 'Database name',
    alertMessage:
      'This action will permanently destroy your database and you will not be able to recover it.',
    checkboxMessage: 'Keep backups storage data',
    disabledCheckboxForPGTooltip:
      'Backups storage data is kept for PostgreSQL databases.',
    confirmButtom: 'Delete',
  },
  responseMessages: {
    restart: 'The database is being restarted',
    resume: 'The database is being resumed',
    pause: 'The database is being suspended',
  },
};
