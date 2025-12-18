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
import { expect, test } from '@playwright/test'
import * as th from './helpers'

const testPrefix = 'pg-res',
  bsName = th.limitedSuffixedName(testPrefix + '-storage')

test.describe('PG backup restore tests', {tag: ['@pg', '@restore']}, () => {
  test.describe.configure({ timeout: 120 * 1000 });

  test.beforeAll(async ({ request }) => {
    await th.createBackupStorageS3(request, bsName)
  })

  test.afterAll(async ({ request }) => {
    await th.deleteBackupStorage(request, bsName)
  })
  // disabling the test since the restore CR now requires the backup to be Succeeded
  // for the successful restore CR creation while the backup actually fails
  // test('create/list/delete db cluster restore', async ({request}) => {
  //   const dbClusterName = th.limitedSuffixedName(testPrefix + '-db'),
  //     backupName = th.limitedSuffixedName(testPrefix + '-db-bak'),
  //     restoreName = th.suffixedName(testPrefix + '-db-restore')
  //
  //   try {
  //     await test.step('prepare env', async () => {
  //       await th.createDBCluster(request, dbClusterName)
  //       await th.createDBClusterBackup(request, dbClusterName, backupName, bsName)
  //     });
  //
  //     await test.step('create db clusters restore', async () => {
  //       await th.createDBClusterRestore(request, restoreName, dbClusterName, backupName)
  //     });
  //
  //     await test.step('list db cluster restore', async () => {
  //       let result = await th.listDBClusterRestores(request, dbClusterName)
  //       expect(result.items).toHaveLength(1)
  //     });
  //
  //     await test.step('delete db clusters restore', async () => {
  //       await th.deleteDBClusterRestore(request, restoreName)
  //     });
  //
  //   } finally {
  //     await th.deleteDBCluster(request, dbClusterName)
  //   }
  // })

  test('create db cluster restore: validation errors', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix + '-val')

    try {
      await test.step('prepare env', async () => {
        await th.createDBCluster(request, dbClusterName)
      });

      await test.step('db cluster not found', async () => {
        const payloadRestore = {
            apiVersion: 'everest.percona.com/v1alpha1',
            kind: 'DatabaseClusterRestore',
            metadata: {
              name: th.suffixedName(testPrefix + '-restore'),
            },
            spec: {
              dataSource: {
                dbClusterBackupName: th.limitedSuffixedName(testPrefix + '-backup'),
              },
              dbClusterName: 'not-existing-cluster',
            },
          }

        const response = await th.createDBClusterRestoreWithDataRaw(request, payloadRestore)
        expect(response.status()).toBe(400)
        expect(await response.text()).toContain('database cluster not-existing-cluster does not exist')
      });

      await test.step('db backup not found', async () => {
        const payloadRestore = {
          apiVersion: 'everest.percona.com/v1alpha1',
          kind: 'DatabaseClusterRestore',
          metadata: {
            name: th.suffixedName(testPrefix + '-restore'),
          },
          spec: {
            dataSource: {
              dbClusterBackupName: 'not-existing-backup',
            },
            dbClusterName: dbClusterName,
          },
        }

        const response = await th.createDBClusterRestoreWithDataRaw(request, payloadRestore)
        expect(response.status()).toBe(400)
        expect(await response.text()).toContain('backup not-existing-backup does not exist')
      });

      await test.step('restore spec is empty', async () => {
        const payloadRestore = {
          apiVersion: 'everest.percona.com/v1alpha1',
          kind: 'DatabaseClusterRestore',
          metadata: {
            name: th.suffixedName(testPrefix + '-restore'),
          },
        }

        const response = await th.createDBClusterRestoreWithDataRaw(request, payloadRestore)
        expect(response.status()).toBe(400)
        expect(await response.text()).toContain('spec.dataSource.dbClusterBackupName cannot be empty')

      });

      await test.step('restore name is empty', async () => {
        const payloadRestore = {
          apiVersion: 'everest.percona.com/v1alpha1',
          kind: 'DatabaseClusterRestore',
          metadata: {},
          spec: {
            dataSource: {
              dbClusterBackupName: th.limitedSuffixedName(testPrefix + '-backup'),
            },
            dbClusterName: dbClusterName,
          },
        }

        const response = await th.createDBClusterRestoreWithDataRaw(request, payloadRestore)
        expect(response.status()).toBe(400)
        expect(await response.text()).toContain('name cannot be empty')
      });

    } finally {
      await th.deleteDBCluster(request, dbClusterName)
    }
  })
})