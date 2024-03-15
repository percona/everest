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
  header: 'Point-in-time Recovery (PITR)',
  description:
    'PITR provides continuous backups of your database, enabling you to restore it to a specific point in time, in case of accidental writes or deletes.',
  enablePitr: 'Enable PITR',
  toEnablePitr:
    'To enable PITR, first set up a backup schedule for this database',
  pitrPgEnabledByDefault:
    'Point-in-time recovery is enabled by default for the PostgreSQL operator and cannot be turned off.',
  captionPitr:
    'Point-in-time recovery provides continuous backups on your database to protect against accidental writes or deletes.',
  pitrCreateHeader: 'Create PitrStep backup every',
  matchedStorageType: (storagetype: string) =>
    `Backups storage: ${storagetype} (storage type is automatically matched to your selection on the Backups page)`,
};
