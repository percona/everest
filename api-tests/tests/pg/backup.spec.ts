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

import {expect, test} from '@playwright/test'
import * as th from '@tests/utils/api';
import {PG_BACKUP_DB_CLUSTER_NAME_ENV, PG_BACKUP_STORAGE_NAME_ENV} from "@tests/pg/consts";
import {TIMEOUTS} from "@root/constants";

const testPrefix = 'pg-backup';

test.describe.parallel('PG cluster backup tests', () => {
  test.describe.configure({timeout: TIMEOUTS.FiveMinutes});

  test('create/list/delete db cluster backup', async ({request}) => {
    const backupName = th.suffixedName(testPrefix),
      dbClusterName = process.env[PG_BACKUP_DB_CLUSTER_NAME_ENV],
      bsName = process.env[PG_BACKUP_STORAGE_NAME_ENV];

    await test.step('create DB cluster backup', async () => {
      const backup = await th.createDBClusterBackup(request, dbClusterName, backupName, bsName)
      expect(backup.metadata.name).toMatch(backupName)
      expect(backup.spec.dbClusterName).toMatch(dbClusterName)
      expect(backup.spec.backupStorageName).toMatch(bsName)
    })

    await test.step('Wait for DB cluster backup to finish', async () => {
      await th.waitForDBClusterBackupToFinish(request, backupName)
    })

    await test.step('list DB cluster backups', async () => {
      await expect(async () => {
        const list = await th.listDBClusterBackups(request, dbClusterName)
        expect(list.items.filter((i) => i.metadata.name == backupName).length).toBe(1)
      }).toPass({
        intervals: [TIMEOUTS.TenSeconds],
        timeout: TIMEOUTS.ThirtySeconds,
      })
    })

    await test.step('Delete DB cluster backup', async () => {
      await th.deleteDBClusterBackup(request, backupName)
    })
  })
});

test.describe.parallel('PG cluster backup validation errors tests', () => {
  test('db cluster not found', async ({request}) => {
    const bsName = process.env[PG_BACKUP_STORAGE_NAME_ENV],
      payloadBackup = {
        apiVersion: 'everest.percona.com/v1alpha1',
        kind: 'DatabaseClusterBackup',
        metadata: {
          name: th.suffixedName(testPrefix + '-absent'),
        },
        spec: {
          dbClusterName: "absent-db-cluster",
          backupStorageName: bsName,
        },
      }
    const response = await th.createDBClusterBackupWithDataRaw(request, payloadBackup)
    expect(response.status()).toBe(422)
    expect(await response.text()).toContain('is invalid: spec.dbClusterName: Not found')
  });

  test('backup spec empty', async ({request}) => {
    const payloadBackup = {
      apiVersion: 'everest.percona.com/v1alpha1',
      kind: 'DatabaseClusterBackup',
      metadata: {
        name: th.suffixedName(testPrefix + '-backup'),
      },
    }
    const response = await th.createDBClusterBackupWithDataRaw(request, payloadBackup)
    expect(response.status()).toBe(422)
    expect(await response.text()).toContain('spec.backupStorageName: Required value: can not be empty')
  });

  test('backup name empty', async ({request}) => {
    const bsName = process.env[PG_BACKUP_STORAGE_NAME_ENV],
      dbClusterName = process.env[PG_BACKUP_DB_CLUSTER_NAME_ENV],
      payloadBackup = {
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
});