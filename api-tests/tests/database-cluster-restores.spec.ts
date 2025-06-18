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
import {checkError, testsNs, waitClusterDeletion} from './helpers';

test('create/delete database cluster restore', async ({ request, page }) => {
  const bsName = th.suffixedName('storage'),
      clName = th.suffixedName('cluster'),
      backupName = th.suffixedName('backup')

  try {
    await th.createBackupStorage(request, bsName, testsNs)
    await th.createDBCluster(request, clName)
    await th.createBackup(request, clName, backupName, bsName)

    const restoreName = th.suffixedName('restore'),

    payloadRestore = {
          apiVersion: 'everest.percona.com/v1alpha1',
          kind: 'DatabaseClusterRestore',
          metadata: {
            name: restoreName,
          },
          spec: {
            dataSource: {
              dbClusterBackupName: backupName,
            },
            dbClusterName: clName,
          },
        }

    let response = await request.post(`/v1/namespaces/${testsNs}/database-cluster-restores`, {
      data: payloadRestore,
    })

    await checkError(response)
    const restore = await response.json()

    expect(restore.spec).toMatchObject(payloadRestore.spec)

    // delete restore
    await request.delete(`/v1/namespaces/${testsNs}/database-cluster-restores/${restoreName}`)
    // check it couldn't be found anymore
    response = await request.get(`/v1/namespaces/${testsNs}/database-cluster-restores/${restoreName}`)
    expect(response.status()).toBe(404)
  } finally {
    await th.deleteBackup(page, request, backupName)
    await th.deleteDBCluster(request, page, clName)
    await waitClusterDeletion(request, page, clName)
    await th.deleteBackupStorage(page, request, bsName, testsNs)
  }
})

test('list restores', async ({ request, page }) => {
  const bsName = th.suffixedName('storage'),
   clName1 = th.suffixedName('cluster1'),
   clName2 = th.suffixedName('cluster2'),
   backupName = th.suffixedName('backup')

  try {
    await th.createBackupStorage(request, bsName, testsNs)
    await th.createDBCluster(request, clName1)
    await th.createDBCluster(request, clName2)
    await th.createBackup(request, clName1, backupName, bsName)

    const restoreName1 = th.suffixedName('restore1'),
        restoreName2 = th.suffixedName('restore2'),

        payloads = [
          {
            apiVersion: 'everest.percona.com/v1alpha1',
            kind: 'DatabaseClusterRestore',
            metadata: {
              name: restoreName1,
            },
            spec: {
              dataSource: {
                dbClusterBackupName: backupName,
              },
              dbClusterName: clName1,
            },
          },
          {
            apiVersion: 'everest.percona.com/v1alpha1',
            kind: 'DatabaseClusterRestore',
            metadata: {
              name: restoreName2,
            },
            spec: {
              dataSource: {
                dbClusterBackupName: backupName,
              },
              dbClusterName: clName2,
            },
          },
        ]

    for (const payload of payloads) {
      const response = await request.post(`/v1/namespaces/${testsNs}/database-cluster-restores`, {
        data: payload,
      })

      await checkError(response)
    }

    await page.waitForTimeout(6000)

    // check if the restores are available when being requested via database-clusters/{cluster-name}/restores path
    let response = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clName1}/restores`),
        result = await response.json()

    expect(result.items).toHaveLength(1)

    response = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clName2}/restores`)
    result = await response.json()

    expect(result.items).toHaveLength(1)

    // delete the created restores
    for (const payload of payloads) {
      await request.delete(`/v1/namespaces/${testsNs}/database-cluster-restores/${payload.metadata.name}`)
      response = await request.get(`/v1/namespaces/${testsNs}/database-cluster-restores/${payload.metadata.name}`)
      expect(response.status()).toBe(404)
    }
  } finally {
    await th.deleteBackup(page, request, backupName)
    await th.deleteDBCluster(request, page, clName1)
    await th.deleteDBCluster(request, page, clName2)
    await waitClusterDeletion(request, page, clName1)
    await waitClusterDeletion(request, page, clName2)
    await th.deleteBackupStorage(page, request, bsName, testsNs)
  }
})

test('create restore: validation errors', async ({ request, page }) => {
  const bsName = th.suffixedName('storage'),
   backupName = th.suffixedName('backup'),
   clName = th.suffixedName('cl')

  try {
    await th.createBackupStorage(request, bsName, testsNs)
    await th.createDBCluster(request, clName)
    await th.createBackup(request, clName, backupName, bsName)

    // dbcluster not found
    const restoreName = th.suffixedName('restore'),
        payloadRestore = {
          apiVersion: 'everest.percona.com/v1alpha1',
          kind: 'DatabaseClusterRestore',
          metadata: {
            name: restoreName,
          },
          spec: {
            dataSource: {
              dbClusterBackupName: backupName,
            },
            dbClusterName: 'not-existing-cluster',
          },
        }

    let response = await request.post(`/v1/namespaces/${testsNs}/database-cluster-restores`, {
      data: payloadRestore,
    })

    expect(response.status()).toBe(400)
    expect(await response.text()).toContain('database cluster not-existing-cluster does not exist')

    // empty spec
    const payloadEmptySpec = {
      apiVersion: 'everest.percona.com/v1alpha1',
      kind: 'DatabaseClusterRestore',
      metadata: {
        name: restoreName,
      },
    }

    response = await request.post(`/v1/namespaces/${testsNs}/database-cluster-restores`, {
      data: payloadEmptySpec,
    })
    expect(response.status()).toBe(400)
    expect(await response.text()).toContain('spec.dataSource.dbClusterBackupName cannot be empty')
  } finally {
    await th.deleteBackup(page, request, backupName)
    await th.deleteDBCluster(request, page, clName)
    await waitClusterDeletion(request, page, clName)
    await th.deleteBackupStorage(page, request, bsName, testsNs)
  }
})
