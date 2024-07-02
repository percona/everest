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
  DbEngine,
  DbEngineStatus,
  DbEngineToolStatus,
  DbEngineType,
} from 'shared-types/dbEngines.types';

export const useDbEngines = (): { isFetching: boolean; data: DbEngine[] } => ({
  data: [
    {
      type: DbEngineType.POSTGRESQL,
      status: DbEngineStatus.NOT_INSTALLED,
      operatorVersion: '1.0.0',
      availableVersions: {
        backup: [],
        proxy: [],
        engine: [],
      },
      name: 'pg-1',
    },
    {
      type: DbEngineType.PSMDB,
      status: DbEngineStatus.INSTALLED,
      operatorVersion: '1.14.0',
      availableVersions: {
        backup: [
          {
            version: '2.0.4',
            description: '2.0.4',
            imageHash:
              '3e351edf305d63fce01c9d4390961c10457fa3b4e42034c26888a2f9131f108d',
            imagePath: 'percona/percona-backup-mongodb:2.0.4',
            status: DbEngineToolStatus.AVAILABLE,
          },
          {
            version: '2.0.5',
            description: '2.0.5',
            imageHash:
              '3e351edf305d63fce01c9d4390961c10457fa3b4e42034c26888a2f9131f108d',
            imagePath: 'percona/percona-backup-mongodb:2.0.5',
            status: DbEngineToolStatus.RECOMMENDED,
          },
        ],
        engine: [
          {
            version: '4.4.10-11',
            description: '4.4.10-11',
            imageHash:
              '3e351edf305d63fce01c9d4390961c10457fa3b4e42034c26888a2f9131f108d',
            imagePath: 'percona/percona-backup-mongodb:4.4.10-11',
            status: DbEngineToolStatus.RECOMMENDED,
          },
          {
            version: '2.0.4',
            description: '2.0.4',
            imageHash:
              '3e351edf305d63fce01c9d4390961c10457fa3b4e42034c26888a2f9131f108d',
            imagePath: 'percona/percona-backup-mongodb:2.0.4',
            status: DbEngineToolStatus.AVAILABLE,
          },
        ],
        proxy: [],
      },
      name: 'psmdb-1',
    },
    {
      type: DbEngineType.PXC,
      status: DbEngineStatus.INSTALLED,
      operatorVersion: '1.12.0',
      availableVersions: {
        backup: [
          {
            version: '2.4.26',
            description: '2.4.26',
            imageHash:
              '3e351edf305d63fce01c9d4390961c10457fa3b4e42034c26888a2f9131f108d',
            imagePath:
              'percona/percona-xtradb-cluster-operator:1.12.0-pxc5.7-backup',
            status: DbEngineToolStatus.AVAILABLE,
          },
          {
            version: '8.0.30',
            description: '8.0.30',
            imageHash:
              '3e351edf305d63fce01c9d4390961c10457fa3b4e42034c26888a2f9131f108d',
            imagePath:
              'percona/percona-xtradb-cluster-operator:1.12.0-pxc8.0-backup',
            status: DbEngineToolStatus.RECOMMENDED,
          },
        ],
        engine: [
          {
            version: '5.7.26-31.37"',
            description: '5.7.26-31.37"',
            imageHash:
              '9d43d8e435e4aca5c694f726cc736667cb938158635c5f01a0e9412905f1327f',
            imagePath: 'percona/percona-xtradb-cluster:5.7.26-31.37',
            status: DbEngineToolStatus.AVAILABLE,
          },
          {
            version: '5.7.27-31.39"',
            description: '5.7.27-31.39"',
            imageHash:
              '9d43d8e435e4aca5c694f726cc736667cb938158635c5f01a0e9412905f1327f',
            imagePath: 'percona/percona-xtradb-cluster:5.7.27-31.39',
            status: DbEngineToolStatus.AVAILABLE,
          },
        ],
        proxy: [
          {
            version: '2.5.6',
            description: '2.5.6',
            imageHash:
              'd900211bf5684839cfbaab3ec939ef7bae770638c7d819904820a3882a2aea32',
            imagePath: 'percona/percona-xtradb-cluster-operator:1.12.0-haproxy',
            status: DbEngineToolStatus.AVAILABLE,
          },
          {
            version: '2.4.4-1.2',
            description: '2.4.4-1.2',
            imageHash:
              'd900211bf5684839cfbaab3ec939ef7bae770638c7d819904820a3882a2aea32',
            imagePath: 'percona/percona-xtradb-cluster-operator:1.12.0-haproxy',
            status: DbEngineToolStatus.AVAILABLE,
          },
        ],
      },
      name: 'pxc-1',
    },
  ],
  isFetching: false,
});
