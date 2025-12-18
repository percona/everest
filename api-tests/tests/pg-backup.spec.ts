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

const testPrefix = 'pg-backup',
  bsName = th.limitedSuffixedName(testPrefix + '-bs-s3')

test.describe('PG cluster backup tests', {tag: ['@pg', '@backup']}, () => {
  test.describe.configure({ timeout: 180 * 1000 });

  test.beforeAll(async ({ request }) => {
    await th.createBackupStorageS3(request, bsName)
  })

  test.afterAll(async ({ request }) => {
    await th.deleteBackupStorage(request, bsName)
  })

  test('create/list/delete db cluster backup', async ({page, request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix + '-sin'),
      backupName = th.suffixedName(dbClusterName + '-backup')

    try {
      await test.step('create DB cluster', async () => {
        await th.createDBCluster(request, dbClusterName)
      });

      await test.step('create DB cluster backup', async () => {
        let backup = await th.createDBClusterBackup(request, dbClusterName, backupName, bsName)
        expect(backup.metadata.name).toMatch(backupName)
        expect(backup.spec.dbClusterName).toMatch(dbClusterName)
        expect(backup.spec.backupStorageName).toMatch(bsName)
        // heuristic interval to wait until the backup is complete
        await page.waitForTimeout(150000)
        backup = await th.getDBClusterBackup(request, backupName)
        // expecting a completed state which allows to delete the backup and the backupStorage
        expect(backup.status.state).toMatch('Failed')
      })

      await test.step('list DB cluster backups', async () => {
        const result = await th.listDBClusterBackups(request, dbClusterName)
        expect(result.items).toHaveLength(1)
      })

    } finally {
      await th.deleteDBCluster(request, dbClusterName)
    }
  })

  test('create db cluster backup: validation errors', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix + '-val')

    try {
      await test.step('prepare env', async () => {
        await th.createDBCluster(request, dbClusterName)
      });

      await test.step('db cluster not found', async () => {
        const payloadBackup = {
          apiVersion: 'everest.percona.com/v1alpha1',
          kind: 'DatabaseClusterBackup',
          metadata: {
            name: th.suffixedName(testPrefix + '-backup'),
          },
          spec: {
            dbClusterName: "absent-db-cluster",
            backupStorageName: bsName,
          },
        }
        const response = await th.createDBClusterBackupWithDataRaw(request, payloadBackup)
        expect(response.status()).toBe(400)
        expect(await response.text()).toContain('database cluster absent-db-cluster does not exist')
      });

      await test.step('backup spec empty', async () => {
        const payloadBackup = {
          apiVersion: 'everest.percona.com/v1alpha1',
          kind: 'DatabaseClusterBackup',
          metadata: {
            name: th.suffixedName(testPrefix + '-backup'),
          },
        }
        const response = await th.createDBClusterBackupWithDataRaw(request, payloadBackup)
        expect(response.status()).toBe(400)
        expect(await response.text()).toContain('.spec.backupStorageName cannot be empty')
      });

      await test.step('backup name empty', async () => {
        const payloadBackup = {
          apiVersion: 'everest.percona.com/v1alpha1',
          kind: 'DatabaseClusterBackup',
          metadata: {},
          spec: {
            dbClusterName: dbClusterName,
            backupStorageName: bsName,
          },
        }
        const response = await th.createDBClusterBackupWithDataRaw(request, payloadBackup)
        expect(response.status()).toBe(422)
        expect(await response.text()).toContain('metadata.name: Required value: name or generateName is required')
      });
    } finally {
      await th.deleteDBCluster(request, dbClusterName)
    }
  })

})