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
import {checkError, deleteDBCluster, testsNs} from "@tests/tests/helpers";

let recommendedVersion

test.beforeAll(async ({ request }) => {
  const engineResponse = await request.get(`/v1/namespaces/${testsNs}/database-engines/percona-postgresql-operator`)
  const availableVersions = (await engineResponse.json()).status.availableVersions.engine

  for (const k in availableVersions) {
    if (availableVersions[k].status === 'recommended') {
      recommendedVersion = k
    }
  }

  expect(recommendedVersion).not.toBe('')
})

test('create/edit/delete single node pg cluster', async ({ request, page }) => {
  const clusterName = 'test-pg-cluster'
  const pgPayload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      engine: {
        type: 'postgresql',
        replicas: 1,
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
        type: 'pgbouncer', // HAProxy is the default option. However using proxySQL is available
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  }

  await request.post(`/v1/namespaces/${testsNs}/database-clusters`, {
    data: pgPayload,
  })
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000)

    const pgCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

    await checkError(pgCluster)

    const result = (await pgCluster.json())

    if (typeof result.status === 'undefined' || typeof result.status.size === 'undefined') {
      continue
    }

    expect(result.metadata.name).toBe(clusterName)
    expect(result.spec).toMatchObject(pgPayload.spec)
    expect(result.status.size).toBe(2)

    // pgPayload should be overriden because kubernetes adds data into metadata field
    // and uses metadata.generation during updation. It returns 422 HTTP status code if this field is not present
    //
    // kubectl under the hood merges everything hence the UX is seemless
    pgPayload.spec = result.spec
    pgPayload.metadata = result.metadata
    break
  }

  pgPayload.spec.engine.replicas = 3

  // Update PG cluster

  const updatedPGCluster = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`, {
    data: pgPayload,
  })

  await checkError(updatedPGCluster)

  let pgCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

  await checkError(pgCluster)

  expect((await updatedPGCluster.json()).spec.clusterSize).toBe(pgPayload.spec.clusterSize)

  await deleteDBCluster(request, page, clusterName)
})

test('expose pg cluster after creation', async ({ request, page }) => {
  const clusterName = 'exposed-pg-cluster'
  const pgPayload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      engine: {
        type: 'postgresql',
        replicas: 1,
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
        type: 'pgbouncer', // HAProxy is the default option. However using proxySQL is available
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  }

  await request.post(`/v1/namespaces/${testsNs}/database-clusters`, {
    data: pgPayload,
  })
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000)

    const pgCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

    await checkError(pgCluster)

    const result = (await pgCluster.json())

    if (typeof result.status === 'undefined' || typeof result.status.size === 'undefined') {
      continue
    }

    expect(result.metadata.name).toBe(clusterName)
    expect(result.spec).toMatchObject(pgPayload.spec)
    expect(result.status.size).toBe(2)

    pgPayload.spec = result.spec
    pgPayload.metadata = result.metadata
    break
  }

  pgPayload.spec.proxy.expose.type = 'external'

  // Update PG cluster

  const updatedPGCluster = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`, {
    data: pgPayload,
  })

  await checkError(updatedPGCluster)

  let pgCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

  await checkError(pgCluster)

  expect((await updatedPGCluster.json()).spec.proxy.expose.type).toBe('external')

  await deleteDBCluster(request, page, clusterName)
})

test('expose pg cluster on EKS to the public internet and scale up', async ({ request, page }) => {
  const clusterName = 'eks-pg-cluster'
  const pgPayload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      engine: {
        type: 'postgresql',
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
        type: 'pgbouncer', // HAProxy is the default option. However using proxySQL is available
        replicas: 3,
        expose: {
          type: 'external', // FIXME: Add internetfacing once it'll be implemented
        },
      },
    },
  }

  await request.post(`/v1/namespaces/${testsNs}/database-clusters`, {
    data: pgPayload,
  })
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000)

    const pgCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

    await checkError(pgCluster)

    const result = (await pgCluster.json())

    if (typeof result.status === 'undefined' || typeof result.status.size === 'undefined') {
      continue
    }

    expect(result.metadata.name).toBe(clusterName)
    expect(result.spec).toMatchObject(pgPayload.spec)
    expect(result.status.size).toBe(6)

    pgPayload.spec = result.spec
    pgPayload.metadata = result.metadata
    break
  }

  pgPayload.spec.engine.replicas = 5

  // Update PG cluster

  const updatedPGCluster = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`, {
    data: pgPayload,
  })

  await checkError(updatedPGCluster)

  await deleteDBCluster(request, page, clusterName)
})
