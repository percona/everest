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
import { expect, test } from '@fixtures'
import {
  checkError,
  testsNs,
  suffixedName,
  createMonitoringConfig,
  deleteMonitoringConfig
} from "@tests/tests/helpers";

test.setTimeout(360 * 1000)

test('create db cluster with monitoring config', async ({ request }) => {
  const clusterName = 'db-monitoring-create'
  const name1 = suffixedName("m1")
  const data = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      monitoring: {
        monitoringConfigName: name1,
      },
      engine: {
        type: 'psmdb',
        replicas: 1,
        storage: {
          size: '4G',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'mongos',
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  }
  await createMonitoringConfig(request, name1)
  const postReq = await request.post(`/v1/namespaces/${testsNs}/database-clusters`, { data })

  await checkError(postReq)

  try {
    await expect(async () => {
      const pgCluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

      await checkError(pgCluster)
      const res = (await pgCluster.json())

      expect(res?.status?.size).toBeGreaterThanOrEqual(1)
    }).toPass({
      intervals: [1000],
      timeout: 60 * 1000,
    })
  } finally {
    await request.delete(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)
    await deleteMonitoringConfig(request, name1)
  }
})

test('update db cluster with a new monitoring config', async ({ request }) => {
  const clusterName = 'dbc-monitoring-put'
  const name1 = suffixedName("m1")
  const name2 = suffixedName("m2")
  await createMonitoringConfig(request, name1)
  await createMonitoringConfig(request, name2)
  const data = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      monitoring: {
        monitoringConfigName: name1,
      },
      engine: {
        type: 'psmdb',
        replicas: 1,
        storage: {
          size: '4G',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'mongos',
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  }

  const postReq = await request.post(`/v1/namespaces/${testsNs}/database-clusters`, { data })

  await checkError(postReq)

  try {
    let res

    await expect(async () => {
      const req = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

      await checkError(req)
      res = (await req.json())
      expect(res?.status?.size).toBeGreaterThanOrEqual(1)
    }).toPass({
      intervals: [1000],
      timeout: 60 * 1000,
    })

    expect(res?.spec?.monitoring?.monitoringConfigName).toBe(name1)

    const putData = data

    putData.metadata = res.metadata
    putData.spec.monitoring.monitoringConfigName = name2
    const putReq = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`, { data: putData })

    await checkError(putReq)
    res = (await putReq.json())
    expect(res?.spec?.monitoring?.monitoringConfigName).toBe(name2)
  } finally {
    await request.delete(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)
    await deleteMonitoringConfig(request, name1)
    await deleteMonitoringConfig(request, name2)
  }
})

test('update db cluster without monitoring config with a new monitoring config', async ({ request }) => {
  const clusterName = 'monitoring-put-empty'
  const data = {
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
          size: '4G',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'mongos',
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  }
  const name2 = suffixedName("m2")
  await createMonitoringConfig(request, name2)
  const postReq = await request.post(`/v1/namespaces/${testsNs}/database-clusters`, { data })

  await checkError(postReq)

  try {
    let res

    await expect(async () => {
      const req = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

      await checkError(req)
      res = (await req.json())
      expect(res?.status?.size).toBeGreaterThanOrEqual(1)
    }).toPass({
      intervals: [1000],
      timeout: 60 * 1000,
    })

    expect(res?.spec?.monitoring?.monitoringConfigName).toBeFalsy()

    const putData = data

    putData.metadata = res.metadata;
    (putData.spec as any).monitoring = { monitoringConfigName: name2 }

    const putReq = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`, { data: putData })

    await checkError(putReq)
    res = (await putReq.json())
    expect(res?.spec?.monitoring?.monitoringConfigName).toBe(name2)
  } finally {
    await request.delete(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)
    await deleteMonitoringConfig(request, name2)
  }
})

test('update db cluster monitoring config with an empty monitoring config', async ({ request }) => {
  const clusterName = 'monit-put-to-empty'
  const name1 = suffixedName("m1")
  const data = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: clusterName,
      namespace: testsNs,
    },
    spec: {
      monitoring: {
        monitoringConfigName: name1,
      },
      engine: {
        type: 'psmdb',
        replicas: 1,
        storage: {
          size: '4G',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'mongos',
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  }
  await createMonitoringConfig(request, name1)
  const postReq = await request.post(`/v1/namespaces/${testsNs}/database-clusters`, { data })

  await checkError(postReq)

  try {
    let res

    await expect(async () => {
      const req = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

      await checkError(req)
      res = (await req.json())
      expect(res?.status?.size).toBeGreaterThanOrEqual(1)
    }).toPass({
      intervals: [1000],
      timeout: 60 * 1000,
    })

    const putData = data

    putData.metadata = res.metadata;
    (putData.spec.monitoring as any) = {}

    const putReq = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`, { data: putData })

    await checkError(putReq)
    res = (await putReq.json())
    expect(res?.spec?.monitoring?.monitoringConfigName).toBeFalsy()
  } finally {
    await request.delete(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)
    await deleteMonitoringConfig(request, name1)
  }
})
