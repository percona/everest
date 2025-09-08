import {expect} from '@playwright/test'
import {CliHelper} from '../helpers/cliHelper'

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

// Checks whether the passed resource is marked for deletion(metadata.deletionTimestamp)
// or checks for '404 Not Found' response from server that means that resource has been deleted
// from K8S.
export const checkResourceDeletion = async (apiResp) => {
  if (apiResp.status() === 200) {
    expect((await apiResp.json()).metadata['deletionTimestamp']).not.toBe('');
  } else {
    expect(apiResp.status()).toBe(404)
  }
}

// --------------------- DB Cluster helpers -----------------------------------------------
// Returns DBCluster object for creating 1-node PG cluster
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
          size: '1Gi',
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

// Returns DBCluster object for creating 1-node PSMDB cluster
export const getPSMDBClusterDataSimple = (name: string) => {
  let data = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseCluster',
    metadata: {
      name: name,
    },
    spec: {
      backup: {
        pitr: {
          enabled: false,
        },
      },
      engine: {
        type: 'psmdb',
        replicas: 1,
        storage: {
          size: '1Gi',
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
      sharding: {
        configServer: {
          replicas: 1,
        },
        enabled: false,
        shards: 2,
      },
    }
  }
  return JSON.parse(JSON.stringify(data))
}

// Returns DBCluster object for creating 1-node PXC cluster
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
          size: '1Gi',
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

// Creates a simple 1-node PG cluster and returns DB creation response (JSON)
export const createDBCluster = async (request, name) => {
  const data = getPGClusterDataSimple(name)
  return await createDBClusterWithData(request, data)
}

// Creates DB cluster with provided data as body.
// Expects successful creation.
export const createDBClusterWithData = async (request, data) => {
  const createResp = await createDBClusterWithDataRaw(request, data)
  await checkError(createResp)
  return (await createResp.json())
}

// Creates DB cluster with provided data as body.
// Returns raw response object without any checks or parsing.
export const createDBClusterWithDataRaw = async (request, data) => {
  return await request.post(`/v1/namespaces/${testsNs}/database-clusters`, { data })
}

export const getDBCluster = async (request, name) => {
  const response = await getDBClusterRaw(request, name)
  await checkError(response)
  // expect(dbClusterResp.ok()).toBeTruthy()
  return (await response.json())
}

export const getDBClusterRaw = async (request, name) => {
  return  await request.get(`/v1/namespaces/${testsNs}/database-clusters/${name}`)
}

export const updateDBCluster = async (request, name, updateData) => {
  const response = await request.put(`/v1/namespaces/${testsNs}/database-clusters/${name}`, { data: updateData })
  await checkError(response)
  return (await response.json())
}

export const deleteDBCluster = async (request, name) => {
  // Wait for deletion mark.
  await expect(async () => {
    await deleteDBClusterRaw(request, name)
    const res = await getDBClusterRaw(request, name)
    await checkResourceDeletion(res)
  }).toPass({
    intervals: [1000],
    timeout: 60 * 1000,
  })
}

export const deleteDBClusterRaw = async (request,  name) => {
  return await request.delete(`/v1/namespaces/${testsNs}/database-clusters/${name}`)
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
  const payload = getBackupStorageS3Payload(name)
  return await createBackupStorageWithData(request, payload)
}

export const createBackupStorageWithData = async (request, data) => {
  const response = await createBackupStorageWithDataRaw(request, data)
  await checkError(response)
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
  const response = await updateBackupStorageRaw(request, name, data)
  await checkError(response)
  return (await response.json())
}

export const updateBackupStorageRaw = async (request, name, data) => {
  return await request.patch(`/v1/namespaces/${testsNs}/backup-storages/${name}`, {data: data})
}

export const deleteBackupStorage = async (request, name) => {
  // Wait for deletion mark.
  await expect(async () => {
    await deleteBackupStorageRaw(request, name)
    const res = await getBackupStorageRaw(request, name)
    await checkResourceDeletion(res)
  }).toPass({
    intervals: [1000],
    timeout: 60 * 1000,
  })
}

export const deleteBackupStorageRaw = async (request, name) => {
  return await request.delete(`/v1/namespaces/${testsNs}/backup-storages/${name}`)
}

// --------------------- DB Backup helpers -----------------------------------------------

export const createDBClusterBackup = async (request, dbClusterName, backupName, storageName) => {
  const payloadBackup = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseClusterBackup',
    metadata: {
      name: backupName,
    },
    spec: {
      dbClusterName: dbClusterName,
      backupStorageName: storageName,
    },
  }
  return await createDBClusterBackupWithData(request, payloadBackup)
}

export const createDBClusterBackupWithData = async (request, data) => {
  const response = await createDBClusterBackupWithDataRaw(request, data)
  await checkError(response)
  return (await response.json())
}

export const createDBClusterBackupWithDataRaw = async (request, data) => {
  return await request.post(`/v1/namespaces/${testsNs}/database-cluster-backups`, { data })
}

export const getDBClusterBackup = async (request, name) => {
  const response = await getDBClusterBackupRaw(request, name)
  await checkError(response)
  return (await response.json())
}

export const getDBClusterBackupRaw = async (request, name) => {
  return await request.get(`/v1/namespaces/${testsNs}/database-cluster-backups/${name}`)
}

export const listDBClusterBackups = async (request, dbClusterName) => {
  const response = await listDBClusterBackupsRaw(request, dbClusterName)
  await checkError(response)
  return (await response.json())
}

export const listDBClusterBackupsRaw = async (request, dbClusterName) => {
  return await request.get(`/v1/namespaces/${testsNs}/database-clusters/${dbClusterName}/backups`)
}

export const deleteDBClusterBackup = async (request, name) => {
  let res = await deleteDBClusterBackupRaw(request, name)

  // Wait for deletion mark.
  await expect(async () => {
    res = await getDBClusterBackupRaw(request, name)
    await checkResourceDeletion(res)
  }).toPass({
    intervals: [1000],
    timeout: 30 * 1000,
  })
}

export const deleteDBClusterBackupRaw = async (request, name) => {
  return await request.delete(`/v1/namespaces/${testsNs}/database-cluster-backups/${name}`)
}

// --------------------- DB Restore helpers -----------------------------------------------
export const createDBClusterRestore = async (request, restoreName, dbClusterName, backupName) => {
  const payload = {
    apiVersion: 'everest.percona.com/v1alpha1',
    kind: 'DatabaseClusterRestore',
    metadata: {
      name: restoreName,
    },
    spec: {
      dataSource: {
        dbClusterBackupName: backupName,
      },
      dbClusterName: dbClusterName,
    },
  }
  return await createDBClusterRestoreWithData(request, payload)
}

export const createDBClusterRestoreWithData = async (request, data) => {
  const response = await createDBClusterRestoreWithDataRaw(request, data)
  await checkError(response)
  return (await response.json())
}

export const createDBClusterRestoreWithDataRaw = async (request, data) => {
  return await request.post(`/v1/namespaces/${testsNs}/database-cluster-restores`, { data })
}

export const getDBClusterRestore = async (request, name) => {
  const response = await getDBClusterRestoreRaw(request, name)
  await checkError(response)
  return (await response.json())
}

export const getDBClusterRestoreRaw = async (request, name) => {
  return await request.get(`/v1/namespaces/${testsNs}/database-cluster-restores/${name}`)
}

export const listDBClusterRestores = async (request, dbClusterName) => {
  const response = await listDBClusterRestoresRaw(request, dbClusterName)
  await checkError(response)
  return (await response.json())
}

export const listDBClusterRestoresRaw = async (request, dbClusterName) => {
  return await request.get(`/v1/namespaces/${testsNs}/database-clusters/${dbClusterName}/restores`)
}

export const deleteDBClusterRestore = async (request, name) => {
  let res = await deleteDBClusterRestoreRaw(request, name)

  // Wait for deletion mark.
  await expect(async () => {
    res = await getDBClusterRestoreRaw(request, name)
    await checkResourceDeletion(res)
  }).toPass({
    intervals: [1000],
    timeout: 30 * 1000,
  })
}

export const deleteDBClusterRestoreRaw = async (request, name) => {
  return await request.delete(`/v1/namespaces/${testsNs}/database-cluster-restores/${name}`)
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
  }
  return  await createMonitoringConfigWithDataRaw(request, miData)
}

export const createMonitoringConfigWithData = async (request, data) => {
  const response = await createMonitoringConfigWithDataRaw(request, data)
  await checkError(response)
  return (await response.json())
}

export const createMonitoringConfigWithDataRaw = async (request, data) => {
  return await request.post(`/v1/namespaces/${testsNs}/monitoring-instances`, { data: data })
}

export const getMonitoringConfig = async (request, name) => {
  const response = await getMonitoringConfigRaw(request, name)
  await checkError(response)
  return (await response.json())
}

export const getMonitoringConfigRaw = async (request, name) => {
  return await request.get(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`)
}

export const updateMonitoringConfig = async (request, name, data) => {
  const response = await updateMonitoringConfigRaw(request, name, data)
  await checkError(response)
  return (await response.json())
}

export const updateMonitoringConfigRaw = async (request, name, data) => {
  return await request.patch(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`, {data: data})
}

export const deleteMonitoringConfig = async (request, name) => {
  // Wait for deletion mark.
  await expect(async () => {
    await deleteMonitoringConfigRaw(request, name)
    const res = await getMonitoringConfigRaw(request, name)
    await checkResourceDeletion(res)
  }).toPass({
    intervals: [1000],
    timeout: 300 * 1000,
  })
}

export const deleteMonitoringConfigRaw = async (request, name) => {
  return await request.delete(`/v1/namespaces/${testsNs}/monitoring-instances/${name}`)
}

// --------------------- DB Engine helpers -----------------------------------------------
export const getPSMDBEngineRecommendedVersion = async (request) => {
  const response = await request.get(`/v1/namespaces/${testsNs}/database-engines/percona-server-mongodb-operator`)
  await checkError(response)

  const availableVersions = (await response.json()).status.availableVersions.engine
  let recommendedVersion

  for (const k in availableVersions) {
    if (availableVersions[k].status === 'recommended') {
      recommendedVersion = k
    }
  }

  expect(recommendedVersion).not.toBe('')
  return recommendedVersion
}
// --------------------- Data Importer helpers -----------------------------------------------
export const createDataImporter = async (cli: CliHelper) => {
  let dataImporterPath = 'testdata/dataimporter.yaml'
  await cli.exec(`kubectl apply -f ${dataImporterPath} || true`)

  await expect(async () => {
    const out = await cli.execSilent(`kubectl get dataimporters`)
    await out.outContains("test-data-importer")
  }).toPass({
    intervals: [1000],
    timeout: 30 * 1000,
  })
}

export const deleteDataImporter = async (cli: CliHelper) => {
  let dataImporterPath = 'testdata/dataimporter.yaml'
  await cli.exec(`kubectl delete -f ${dataImporterPath} || true`)

  await expect(async () => {
    const out = await cli.execSilent(`kubectl get dataimporters`)
    await out.outNotContains(["test-data-importer"])
  }).toPass({
    intervals: [2000],
    timeout: 30 * 1000,
  })
}

export const getDataImportJobs = async (request, dbClusterName) => {
  const response = await getDataImportJobsRaw(request, dbClusterName)
  await checkError(response)
  return (await response.json())
}

export const getDataImportJobsRaw = async (request, dbClusterName) => {
  return await request.get(`/v1/namespaces/${testsNs}/database-clusters/${dbClusterName}/data-import-jobs`)
}
