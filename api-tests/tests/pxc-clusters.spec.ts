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
import {checkError, testsNs, deleteDBCluster} from '@tests/tests/helpers';

let recommendedVersion

test.setTimeout(120 * 1000)

test.beforeAll(async ({ request }) => {
  const engineResponse = await request.get(`/v1/namespaces/${testsNs}/database-engines/percona-xtradb-cluster-operator`),
   availableVersions = (await engineResponse.json()).status.availableVersions.engine

  for (const k in availableVersions) {
    if (k.startsWith('5')) {
      continue
    }

    if (availableVersions[k].status === 'recommended') {
      recommendedVersion = k
    }
  }

  expect(recommendedVersion).not.toBe('')
})

test('create/edit/delete pxc single node cluster', async ({ request, page }) => {
  const clusterName = 'test-pxc-cluster',
   pxcPayload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      engine: {
        type: 'pxc',
        replicas: 1,
        version: recommendedVersion,
        storage: {
          size: '25Gi',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'haproxy', // HAProxy is the default option. However using proxySQL is available
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  }

  await request.post(`/v1/namespaces/${testsNs}/database-clusters`, {
    data: pxcPayload,
  })
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000)

    const pxcCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

    await checkError(pxcCluster)

    const result = (await pxcCluster.json())

    if (typeof result.status === 'undefined' || typeof result.status.size === 'undefined') {
      continue
    }

    expect(result.metadata.name).toBe(clusterName)
    expect(result.spec).toMatchObject(pxcPayload.spec)
    expect(result.status.size).toBe(2)

    // pxcPayload should be overriden because kubernetes adds data into metadata field
    // and uses metadata.generation during updation. It returns 422 HTTP status code if this field is not present
    //
    // kubectl under the hood merges everything hence the UX is seemless
    pxcPayload.spec = result.spec
    pxcPayload.metadata = result.metadata
    break
  }

  pxcPayload.spec.engine.config = '[mysqld]\nwsrep_provider_options="debug=1;gcache.size=1G"\n'

  // check that the /pitr endpoint returns OK and an empty object since pitr is not enabled
  const pitrResponse = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}/pitr`)

  await checkError(pitrResponse)
  const pitrInfo = (await pitrResponse.json())

  expect(pitrInfo.latestBackupName).toBe(undefined)
  expect(pitrInfo.earliestDate).toBe(undefined)
  expect(pitrInfo.latestDate).toBe(undefined)

  // Update PXC cluster
  expect(pxcPayload.metadata['resourceVersion']).toBeDefined()

  const updatedPXCCluster = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`, {
    data: pxcPayload,
  })

  await checkError(updatedPXCCluster)

  const pxcCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

  await checkError(pxcCluster)

  expect((await updatedPXCCluster.json()).spec.databaseConfig).toBe(pxcPayload.spec.databaseConfig)

  await deleteDBCluster(request, page, clusterName)
})

test('expose pxc cluster after creation', async ({ request, page }) => {
  const clusterName = 'exposed-pxc-cluster',
   pxcPayload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      engine: {
        type: 'pxc',
        replicas: 3,
        version: recommendedVersion,
        storage: {
          size: '25G',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'haproxy', // HAProxy is the default option. However using proxySQL is available
        replicas: 3,
        expose: {
          type: 'internal',
        },
      },
    },
  }

  await request.post(`/v1/namespaces/${testsNs}/database-clusters`, {
    data: pxcPayload,
  })
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(4000)

    const pxcCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

    await checkError(pxcCluster)

    const result = (await pxcCluster.json())

    if (typeof result.status === 'undefined' || typeof result.status.size === 'undefined') {
      continue
    }

    expect(result.metadata.name).toBe(clusterName)
    expect(result.spec).toMatchObject(pxcPayload.spec)
    expect(result.status.size).toBe(6)

    pxcPayload.spec = result.spec
    pxcPayload.metadata = result.metadata
    break
  }

  pxcPayload.spec.proxy.expose.type = 'external'

  // Update PXC cluster
  expect(pxcPayload.metadata['resourceVersion']).toBeDefined()

  const updatedPXCCluster = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`, {
    data: pxcPayload,
  })

  await checkError(updatedPXCCluster)

  const pxcCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

  await checkError(pxcCluster)

  expect((await updatedPXCCluster.json()).spec.proxy.expose.type).toBe('external')

  await deleteDBCluster(request, page, clusterName)
})

test('expose pxc cluster on EKS to the public internet and scale up', async ({ request, page }) => {
  const clusterName = 'eks-pxc-cluster',
   pxcPayload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      engine: {
        type: 'pxc',
        replicas: 3,
        version: recommendedVersion,
        storage: {
          size: '25G',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'haproxy', // HAProxy is the default option. However using proxySQL is available
        replicas: 3,
        expose: {
          type: 'external', // FIXME: Add Internetfacing once it'll be implemented
        },
      },
    },
  }

  await request.post(`/v1/namespaces/${testsNs}/database-clusters`, {
    data: pxcPayload,
  })
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000)

    const pxcCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

    await checkError(pxcCluster)

    const result = (await pxcCluster.json())

    if (typeof result.status === 'undefined' || typeof result.status.size === 'undefined') {
      continue
    }

    expect(result.metadata.name).toBe(clusterName)
    expect(result.spec).toMatchObject(pxcPayload.spec)
    expect(result.status.size).toBe(6)

    pxcPayload.spec = result.spec
    pxcPayload.metadata = result.metadata
    break
  }

  pxcPayload.spec.engine.replicas = 5

  // Update PXC cluster
  expect(pxcPayload.metadata['resourceVersion']).toBeDefined()

  const updatedPXCCluster = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`, {
    data: pxcPayload,
  })

  await checkError(updatedPXCCluster)

  await deleteDBCluster(request, page, clusterName)
})
