import {expect, test} from '@playwright/test'

// testPrefix is used to differentiate between several workers
// running this test to avoid conflicts in instance names
export const testPrefix = ()=> `t${(Math.random() + 1).toString(36).substring(10)}`

export const suffixedName = (name) => {
  return `${name}-${testPrefix()}`
}

export const checkError = async response => {
  if (!response.ok()) {
    console.log(`${response.url()}: `, await response.json());
  }
  expect(response.ok()).toBeTruthy()
}

export const testsNs = 'everest'

export const createDBCluster = async (request, name) => {
  const data = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: name,
      namespace: testsNs,
    },
    spec: {
      engine: {
        type: 'pxc',
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
        type: 'haproxy',
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  }

  const postReq = await request.post(`/v1/namespaces/${testsNs}/database-clusters`, { data })

  await checkError(postReq)
}

export const deleteDBCluster = async (request, page, name) => {
  let res = await request.delete(`/v1/namespaces/${testsNs}/database-clusters/${name}`)

  for (let i = 0; i < 100; i++) {
    const cluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${name}`)
    if (cluster.status() == 404) {
      return;
    }
    let data = await cluster.json()
    data.metadata.finalizers = null

    await request.put(`/v1/namespaces/${testsNs}/database-clusters/${name}`, { data })
    await page.waitForTimeout(1000)
  }
}

export const createBackupStorage = async (request, name) => {
  const storagePayload = {
    type: 's3',
    name,
    url: 'http://custom-url',
    description: 'Dev storage',
    bucketName: 'percona-test-backup-storage',
    region: 'us-east-2',
    accessKey: 'sdfs',
    secretKey: 'sdfsdfsd',
    allowedNamespaces: [testsNs],
  }

  const response = await request.post(`/v1/backup-storages`, { data: storagePayload })

  await checkError(response)
}

export const deleteBackupStorage = async (request, name) => {
  const res = await request.delete(`/v1/backup-storages/${name}`)

  await checkError(res)
}

export const createBackup = async (request,  clusterName, backupName, storageName) => {
  const payloadBackup = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseClusterBackup',
    metadata: {
      name: backupName,
    },
    spec: {
      dbClusterName: clusterName,
      backupStorageName: storageName,
    },
  }

  const responseBackup = await request.post(`/v1/namespaces/${testsNs}/database-cluster-backups`, {
    data: payloadBackup,
  })

  await checkError(responseBackup)
}

export const deleteBackup = async (request, backupName) => {
  const res = await request.delete(`/v1/namespaces/${testsNs}/database-cluster-backups/${backupName}`)

  await checkError(res)
}

export const deleteRestore = async (request, restoreName) => {
  const res = await request.delete(`/v1/namespaces/${testsNs}/database-cluster-restores/${restoreName}`)

  await checkError(res)
}

export const checkObjectDeletion = async (obj) => {
  if (obj.status() == 200) {
    expect((await obj.json()).metadata["deletionTimestamp"]).not.toBe('');
  } else {
    expect(obj.status()).toBe(404)
  }
}

export const checkClusterDeletion = async (cluster) => {
  if (cluster.status() == 200) {
    expect((await cluster.json()).metadata["deletionTimestamp"]).not.toBe('');
  } else {
    expect(cluster.status()).toBe(404)
  }
}

export const waitClusterDeletion = async (request, page, clusterName) => {
  for (let i = 0; i < 100; i++) {
    const cluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)
    if (cluster.status() == 404) {
      break;
    }
    await page.waitForTimeout(1000)
  }
  const cluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)
  expect(cluster.status()).toBe(404)
}

export const createMonitoringConfig = async (request, name) => {
  const miData = {
    type: 'pmm',
    name: name,
    url: 'http://monitoring',
    allowedNamespaces: [testsNs],
    pmm: {
      apiKey: '123',
    },
  }
  let res = await request.post('/v1/monitoring-instances', { data: miData })

  await checkError(res)
}

export const deleteMonitoringConfig = async (request, name) => {
  let res = await request.delete(`/v1/monitoring-instances/${name}`)

  await checkError(res)
}
