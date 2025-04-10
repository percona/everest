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
import { test, expect } from '@fixtures'
import {checkError, deleteDBCluster, testsNs} from '@tests/tests/helpers';

test.setTimeout(240 * 1000)

test.beforeAll(async ({ request }) => {
  const engineResponse = await request.get(`/v1/namespaces/${testsNs}/database-engines/percona-server-mongodb-operator`)
})

test('create/edit/delete single node psmdb cluster', async ({ request, page }) => {
  const clusterName = 'test-psmdb',
   psmdbPayload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      engine: {
        type: 'psmdb',
        replicas: 1,
        storage: {
          size: '25G',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'mongos', // HAProxy is the default option. However using proxySQL is available
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  }

  await request.post(`/v1/namespaces/${testsNs}/database-clusters`, {
    data: psmdbPayload,
  })
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000)

    const psmdbCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

    await checkError(psmdbCluster)

    const result = (await psmdbCluster.json())

    if (typeof result.status === 'undefined' || typeof result.status.size === 'undefined') {
      continue
    }

    expect(result.metadata.name).toBe(clusterName)
    expect(result.spec).toMatchObject(psmdbPayload.spec)
    expect(result.status.size).toBe(1)
    break
  }

  psmdbPayload.spec.engine.config = 'operationProfiling:\nmode: slowOp'

  let psmdbCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

  await checkError(psmdbCluster)
  const result = (await psmdbCluster.json())

  psmdbPayload.spec = result.spec
  psmdbPayload.metadata = result.metadata

  // Update PSMDB cluster
  expect(psmdbPayload.metadata['resourceVersion']).toBeDefined()

  const updatedPSMDBCluster = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`, {
    data: psmdbPayload,
  })

  await checkError(updatedPSMDBCluster)

  psmdbCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

  await checkError(psmdbCluster)

  expect((await updatedPSMDBCluster.json()).spec.engine.config).toBe(psmdbPayload.spec.engine.config)

  await deleteDBCluster(request, page, clusterName)
})

test('expose psmdb cluster after creation', async ({ request, page }) => {
  const clusterName = 'expose-psmdb',
   psmdbPayload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      engine: {
        type: 'psmdb',
        replicas: 3,
        storage: {
          size: '25G',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'mongos', // HAProxy is the default option. However using proxySQL is available
        replicas: 3,
        expose: {
          type: 'internal',
        },
      },
    },
  }

  await request.post(`/v1/namespaces/${testsNs}/database-clusters`, {
    data: psmdbPayload,
  })

  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000)

    const psmdbCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

    await checkError(psmdbCluster)

    const result = (await psmdbCluster.json())

    if (typeof result.status === 'undefined' || typeof result.status.size === 'undefined') {
      continue
    }

    expect(result.metadata.name).toBe(clusterName)
    expect(result.spec).toMatchObject(psmdbPayload.spec)
    expect(result.status.size).toBe(3)

    break
  }

  let psmdbCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

  await checkError(psmdbCluster)
  const result = (await psmdbCluster.json())

  psmdbPayload.spec = result.spec
  psmdbPayload.metadata = result.metadata
  psmdbPayload.spec.proxy.expose.type = 'external'

  // Update PSMDB cluster
  expect(psmdbPayload.metadata['resourceVersion']).toBeDefined()

  const updatedPSMDBCluster = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`, {
    data: psmdbPayload,
  })

  await checkError(updatedPSMDBCluster)
  await page.waitForTimeout(1000)

  psmdbCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

  await checkError(psmdbCluster)

  expect((await updatedPSMDBCluster.json()).spec.proxy.expose.type).toBe('external')

  await deleteDBCluster(request, page, clusterName)
})

test('expose psmdb cluster on EKS to the public internet and scale up', async ({ request, page }) => {
  const clusterName = 'eks-psmdb',
   psmdbPayload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      engine: {
        type: 'psmdb',
        replicas: 3,
        storage: {
          size: '25G',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'mongos', // HAProxy is the default option. However using proxySQL is available
        replicas: 3,
        expose: {
          type: 'external', // FIXME: Add internetfacing once it'll be implemented
        },
      },
    },
  }

  await request.post(`/v1/namespaces/${testsNs}/database-clusters`, {
    data: psmdbPayload,
  })
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000)

    const psmdbCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

    await checkError(psmdbCluster)

    const result = (await psmdbCluster.json())

    if (typeof result.status === 'undefined' || typeof result.status.size === 'undefined') {
      continue
    }

    expect(result.metadata.name).toBe(clusterName)
    expect(result.spec).toMatchObject(psmdbPayload.spec)
    expect(result.status.size).toBe(3)
    break
  }

  psmdbPayload.spec.engine.replicas = 5
  let psmdbCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

  await checkError(psmdbCluster)
  const result = (await psmdbCluster.json())

  psmdbPayload.spec = result.spec
  psmdbPayload.metadata = result.metadata

  // Update PSMDB cluster
  expect(psmdbPayload.metadata['resourceVersion']).toBeDefined()

  const updatedPSMDBCluster = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`, {
    data: psmdbPayload,
  })

  await checkError(updatedPSMDBCluster)

  psmdbCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

  await checkError(psmdbCluster)

  await deleteDBCluster(request, page, clusterName)
})

test('sharded psmdb cluster', async ({ request, page }) => {
  const clusterName = 'sharding-psmdb',
   psmdbPayload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      sharding: {
        enabled: true,
        shards: 2,
        configServer: {
          replicas: 1,
        },
      },
      engine: {
        version: '8.0.4-1',
        type: 'psmdb',
        replicas: 1,
        storage: {
          size: '25G',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'mongos', // HAProxy is the default option. However using proxySQL is available
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  },

   created = await request.post(`/v1/namespaces/${testsNs}/database-clusters`, {
    data: psmdbPayload,
  })

  await checkError(created)

  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(5000)

    const psmdbCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

    await checkError(psmdbCluster)

    const result = (await psmdbCluster.json())

    // waiting for 4 components to be ready (1 node * 2 shards + 1 configservers + 1 mongos)
    if (typeof result.status === 'undefined' || typeof result.status.size === 'undefined' || result.status.size !== 4 || result.status.ready !== 4) {
      continue
    }

    expect(result.metadata.name).toBe(clusterName)
    expect(result.spec).toMatchObject(psmdbPayload.spec)
    expect(result.status.status).toBe('ready')

    break
  }

  await deleteDBCluster(request, page, clusterName)
})
