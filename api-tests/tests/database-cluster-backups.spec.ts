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
import {checkError, testsNs, checkObjectDeletion} from "./helpers";

test('create/delete database cluster backups', async ({ request, page }) => {
  const bsName = th.suffixedName('storage')
  const clName = th.suffixedName('cluster')

  await th.createBackupStorage(request, bsName)
  await th.createDBCluster(request, clName)

  const backupName = th.suffixedName('backup')

  const payload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseClusterBackup',
    metadata: {
      name: backupName,
    },
    spec: {
      dbClusterName: clName,
      backupStorageName: bsName,
    },
  }

  let response = await request.post(`/v1/namespaces/${testsNs}/database-cluster-backups`, {
    data: payload,
  })

  await checkError(response)

  response = await request.get(`/v1/namespaces/${testsNs}/database-cluster-backups/${backupName}`)
  const result = await response.json()

  expect(result.spec).toMatchObject(payload.spec)

  await th.deleteBackup(request, backupName)
  await th.deleteDBCluster(request, page, clName)
  await th.deleteBackupStorage(request, bsName)
})

test('dbcluster not found', async ({ request }) => {
  const bsName = th.suffixedName('storage')

  await th.createBackupStorage(request, bsName)

  const backupName = th.suffixedName('backup')
  const payload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseClusterBackup',
    metadata: {
      name: backupName,
    },
    spec: {
      dbClusterName: 'not-existing-cluster',
      backupStorageName: bsName,
    },
  }

  const response = await request.post(`/v1/namespaces/${testsNs}/database-cluster-backups`, {
    data: payload,
  })

  expect(response.status()).toBe(400)
  expect(await response.text()).toContain('{"message":"Database cluster not-existing-cluster does not exist"}')

  await th.deleteBackupStorage(request, bsName)
})

test('list backups', async ({ request, page }) => {
  const bsName = th.suffixedName('storage')
  const clusterName1 = th.suffixedName('cluster1')
  const clusterName2 = th.suffixedName('cluster2')

  await th.createBackupStorage(request, bsName)
  await th.createDBCluster(request, clusterName1)
  await th.createDBCluster(request, clusterName2)

  const backupName1 = th.suffixedName('backup1')
  const backupName2 = th.suffixedName('backup2')
  const backupName3 = th.suffixedName('backup3')
  const backupName4 = th.suffixedName('backup4')

  const payloads = [
    {
      apiVersion: 'everest.percona.com/v1alpha1',
      kind: 'DatabaseClusterBackup',
      metadata: {
        name: backupName1,
      },
      spec: {
        dbClusterName: clusterName1,
        backupStorageName: bsName,
      },
    },
    {
      apiVersion: 'everest.percona.com/v1alpha1',
      kind: 'DatabaseClusterBackup',
      metadata: {
        name: backupName2,
      },
      spec: {
        dbClusterName: clusterName1,
        backupStorageName: bsName,
      },
    },
    {
      apiVersion: 'everest.percona.com/v1alpha1',
      kind: 'DatabaseClusterBackup',
      metadata: {
        name: backupName3,
      },
      spec: {
        dbClusterName: clusterName2,
        backupStorageName: bsName,
      },
    },
    {
      apiVersion: 'everest.percona.com/v1alpha1',
      kind: 'DatabaseClusterBackup',
      metadata: {
        name: backupName4,
      },
      spec: {
        dbClusterName: clusterName2,
        backupStorageName: bsName,
      },
    },
  ]

  for (const payload of payloads) {
    const response = await request.post(`/v1/namespaces/${testsNs}/database-cluster-backups`, {
      data: payload,
    })

    await checkError(response)
  }

  await page.waitForTimeout(1000)
  let response = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName1}/backups`)
  let result = await response.json()

  expect(result.items).toHaveLength(2)

  response = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName2}/backups`)
  result = await response.json()

  expect(result.items).toHaveLength(2)

  for (const payload of payloads) {
    await request.delete(`/v1/namespaces/${testsNs}/database-cluster-backups/${payload.metadata.name}`)
    response = await request.get(`/v1/namespaces/${testsNs}/database-cluster-backups/${payload.metadata.name}`)
    checkObjectDeletion(response)
  }

  await th.deleteDBCluster(request, page, clusterName1)
  await th.deleteDBCluster(request, page, clusterName2)
  await th.deleteBackupStorage(request, bsName)
})
