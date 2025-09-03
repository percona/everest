import {expect} from '@playwright/test'
import {execSync} from 'child_process';
import {CliHelper} from '../helpers/cliHelper'
import {req} from "agent-base";

export const testsNs = 'everest'

// --------------------- General helpers --------------------------------------------------
// testPrefix is used to differentiate between several workers
// running this test to avoid conflicts in instance names
export const testPrefix = () => {
  let result = '';
  while (result.length < 16) {
    result += Math.random().toString(36).substring(2);
  }
  return result.substring(0, 16);
}

export const suffixedName = (name: string) => {
  return `${name}-${testPrefix()}`
}

export const limitedSuffixedName = (name: string) => {
  return `${name}-${testPrefix()}`.substring(0, 21)
}

export const checkError = async (response) => {
  if (!response.ok()) {
    console.log(`${response.url()}: `, await response.json());
  }

  expect(response.ok()).toBeTruthy()
}

// --------------------- DB Cluster helpers -----------------------------------------------
// returns DBCluster object for creating 1-node PG cluster
export const getPGClusterDataSimple = (name: string) => {
  const  data = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: name,
    },
    spec: {
      engine: {
        type: 'postgresql',
        replicas: 1,
        storage: {
          size: '1G',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'pgbouncer',
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  }
  return JSON.parse(JSON.stringify(data))
}

// returns DBCluster object for creating 1-node PSMDB cluster
export const getPSMDBClusterDataSimple = (name: string) => {
  let data = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: name,
    },
    spec: {
      engine: {
        type: 'psmdb',
        replicas: 1,
        storage: {
          size: '1G',
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
  return JSON.parse(JSON.stringify(data))
}

// returns DBCluster object for creating 1-node PXC cluster
export const getPXCClusterDataSimple = (name: string) => {
  let data = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: name,
    },
    spec: {
      engine: {
        type: 'pxc',
        replicas: 1,
        config: '[mysqld]\nwsrep_provider_options="debug=1;gcache.size=1G"\n',
        storage: {
          size: '1G',
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
  return JSON.parse(JSON.stringify(data))
}

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
        type: 'postgresql',
        replicas: 1,
        storage: {
          size: '1G',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      proxy: {
        type: 'pgbouncer',
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  },
   createResp = await request.post(`/v1/namespaces/${testsNs}/database-clusters`, { data })
  await checkError(createResp)
}

// Creates DB cluster with provided data as body.
// Expects successful creation.
export const createDBClusterWithData = async (request, data) => {
  const createResp = await createDBClusterWithDataRaw(request, data)
  expect(createResp.ok()).toBeTruthy()
}

// Creates DB cluster with provided data as body.
// Returns raw response object without any checks.
export const createDBClusterWithDataRaw = async (request, data) => {
  return await request.post(`/v1/namespaces/${testsNs}/database-clusters`, { data })
}

export const getDBCluster = async (request, name) => {
  const dbClusterResp = await getDBClusterRaw(request, name)
  await checkError(dbClusterResp)
  // expect(dbClusterResp.ok()).toBeTruthy()
  return (await dbClusterResp.json())
}

export const getDBClusterRaw = async (request, name) => {
  return  await request.get(`/v1/namespaces/${testsNs}/database-clusters/${name}`)
}

export const updateDBCluster = async (request, name, updateData) => {
  const updateResp = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${name}`, { data: updateData })
  await checkError(updateResp)
  // expect(updateResp.status()).toBe(200)
  return (await updateResp.json())
}

export const deleteDBCluster = async (request, page, name) => {
  await request.delete(`/v1/namespaces/${testsNs}/database-clusters/${name}`)

  for (let i = 0; i < 100; i++) {
    const cluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${name}`)

    if (cluster.status() === 404) {
      return;
    }

    // const data = await cluster.json()

    // const engineType = data.spec.engine.type === 'postgresql' ? 'pg' : data.spec.engine.type
    // // remove finalizers but ignore errors, e.g. if the object is already deleted
    // const command = `kubectl patch --namespace ${testsNs} ${engineType} ${name} --type='merge' -p '{"metadata":{"finalizers":null}}' | true`;
    // const output = execSync(command).toString();

    await page.waitForTimeout(1000)
  }
}

export const checkClusterDeletion = async (cluster) => {
  if (cluster.status() === 200) {
    expect((await cluster.json()).metadata['deletionTimestamp']).not.toBe('');
  } else {
    expect(cluster.status()).toBe(404)
  }
}

export const waitClusterDeletion = async (request, page, clusterName) => {
  for (let i = 0; i < 100; i++) {
    const cluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

    if (cluster.status() === 404) {
      break;
    }

    await page.waitForTimeout(1000)
  }

  const cluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)

  expect(cluster.status()).toBe(404)
}
// --------------------- Backup Storage helpers -----------------------------------------
export const getBackupStorageS3Payload = (bsName: string) => {
  const payload = {
      type: 's3',
      name: bsName,
      url: 'http://custom-url',
      description: 'Dev storage',
      bucketName: bsName,
      region: 'us-east-2',
      accessKey: 'sdfs',
      secretKey: 'sdfsdfsd',
      allowedNamespaces: [testsNs]
    }
  return JSON.parse(JSON.stringify(payload))
}

export const getBackupStorageAzurePayload = (bsName: string) => {
  const payload = {
      type: 'azure',
      name: bsName,
      description: 'Dev storage',
      region: 'us-east-2',
      bucketName: bsName,
      accessKey: 'sdfs',
      secretKey: 'sdfsdfsd',
      allowedNamespaces: [testsNs]
    }
  return JSON.parse(JSON.stringify(payload))
}

export const createBackupStorageS3 = async (request, name) => {
  const payload = getBackupStorageS3Payload(name),
    response = await createBackupStorageWithData(request, payload)
  return (await response.json())
}

export const createBackupStorageWithData = async (request, data) => {
  const response = await createBackupStorageWithDataRaw(request, data)
  expect(response.ok()).toBeTruthy()
  return (await response.json())
}

export const createBackupStorageWithDataRaw = async (request, data) => {
  return await request.post(`/v1/namespaces/${testsNs}/backup-storages`, { data: data })
}

export const getBackupStorage = async (request, name) => {
  const response = await getBackupStorageRaw(request, name)
  await checkError(response)
  return (await response.json())
}

export const getBackupStorageRaw = async (request, name) => {
  return await request.get(`/v1/namespaces/${testsNs}/backup-storages/${name}`)
}

export const listBackupStorages = async (request) => {
  const response = await listBackupStoragesRaw(request)
  await checkError(response)
  return (await response.json())
}

export const listBackupStoragesRaw = async (request) => {
  return await request.get(`/v1/namespaces/${testsNs}/backup-storages`)
}

export const updateBackupStorage = async (request, name, data) => {
  const resp = await updateBackupStorageRaw(request, name, data)
  expect(resp.ok()).toBeTruthy()
  return (await resp.json())
}

export const updateBackupStorageRaw = async (request, name, data) => {
  return await request.patch(`/v1/namespaces/${testsNs}/backup-storages/${name}`, {data: data})
}

export const deleteBackupStorage = async (page, request, name) => {
  let res
  for (let i = 0; i < 100; i++) {
    res = await deleteBackupStorageRaw(request, name)
    if (res.status() === 404) {
      return;
    }

    if (res.ok()) {
        break;
    }

    await page.waitForTimeout(1000)
  }

  await checkError(res)
}

export const deleteBackupStorageRaw = async (request, name) => {
  return await request.delete(`/v1/namespaces/${testsNs}/backup-storages/${name}`)
}

// --------------------- DB Backup helpers -----------------------------------------------

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
  },

   responseBackup = await request.post(`/v1/namespaces/${testsNs}/database-cluster-backups`, {
    data: payloadBackup,
  })

  await checkError(responseBackup)
}

export const deleteBackup = async (page, request, name) => {
  const res = await request.delete(`/v1/namespaces/${testsNs}/database-cluster-backups/${name}`)

  checkError(res)
  for (let i = 0; i < 100; i++) {
    const bkp = await request.get(`/v1/namespaces/${testsNs}/database-cluster-backups/${name}`)

    if (bkp.status() === 404) {
      return;
    }

    // remove finalizers.
    const data = await bkp.json()

    data.metadata.finalizers = null
    await request.put(`/v1/namespaces/${testsNs}/database-cluster-backups/${name}`, { data })

    await page.waitForTimeout(1000)
  }
}

export const deleteRestore = async (request, restoreName) => {
  const res = await request.delete(`/v1/namespaces/${testsNs}/database-cluster-restores/${restoreName}`)

  await checkError(res)
}

export const checkObjectDeletion = async (obj) => {
  if (obj.status() === 200) {
    expect((await obj.json()).metadata['deletionTimestamp']).not.toBe('');
  } else {
    expect(obj.status()).toBe(404)
  }
}

// --------------------- Monitoring Config helpers ---------------------------------------
export const createMonitoringConfig = async (request, name) => {
  const miData = {
    type: 'pmm',
    name: name,
    url: `https://${process.env.PMM1_IP}`,
    pmm: {
      apiKey: `${process.env.PMM1_API_KEY}`,
    },
    verifyTLS: false,
  },
   res = await createMonitoringConfigWithDataRaw(request, miData)

  expect(res.ok()).toBeTruthy()
}

export const createMonitoringConfigWithData = async (request, data) => {
  const res = await createMonitoringConfigWithDataRaw(request, data)
  expect(res.ok()).toBeTruthy()
  return (await res.json())
}

export const createMonitoringConfigWithDataRaw = async (request, data) => {
  return await request.post(`/v1/namespaces/${testsNs}/monitoring-instances`, { data: data })
}

export const getMonitoringConfig = async (request, name) => {
  const resp = await getMonitoringConfigRaw(request, name)
  await checkError(resp)
  return (await resp.json())
}

export const getMonitoringConfigRaw = async (request, name) => {
  return await request.get(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`)
}

export const updateMonitoringConfig = async (request, name, data) => {
  const resp = await updateMonitoringConfigRaw(request, name, data)
  // await checkError(resp)
  expect(resp.ok()).toBeTruthy()
  return (await resp.json())
}

export const updateMonitoringConfigRaw = async (request, name, data) => {
  return await request.patch(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`, {data: data})
}

export const deleteMonitoringConfig = async (request, name) => {
  const res = await deleteMonitoringConfigRaw(request, name)

  if (res.status() === 404) {
    return;
  }

  await checkError(res)
}

export const deleteMonitoringConfigRaw = async (request, name) => {
  return await request.delete(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`)
}

// --------------------- Dat Importer helpers -----------------------------------------------
export const createDataImporter = async (cli: CliHelper) => {
  let dataImporterPath = 'testdata/dataimporter.yaml'
  await cli.exec(`kubectl apply -f ${dataImporterPath} || true`)
  const out = await cli.execSilent(`kubectl get dataimporters`)
  out.outContains("test-data-importer")
}
