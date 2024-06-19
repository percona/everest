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

import { DbType } from '@percona/types';

export const Messages = {
  sectionHeader: 'Point-in-time Recovery',
  description:
    'PITR provides continuous backups of your database, enabling you to restore it to a specific point in time, in case of accidental writes or deletes.',
  enablePitr: 'Enable PITR',
  enablePitrCaption:
    'Point-in-time Recovery is enabled for every backup schedule you create and stored in the same storage location as the scheduled backup.',
  toEnablePitr:
    'To enable PITR, first set up a backup schedule for this database',
  captionPitr:
    'Point-in-time recovery provides continuous backups on your database to protect against accidental writes or deletes.',
  pitrCreateHeader: 'Create PitrStep backup every',
  pitrSwitchLabelCaption: (dbType: DbType, storageName: string) => {
    switch (dbType) {
      case DbType.Mongo: {
        return storageName ? `Storage: ${storageName}` : '';
      }
      case DbType.Postresql: {
        return Messages.enablePitrCaption;
      }
      default:
        return undefined;
    }
  },
};
