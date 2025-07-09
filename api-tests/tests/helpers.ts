import {expect} from '@playwright/test'
import { execSync } from 'child_process';
import { CliHelper } from '../helpers/cliHelper'

// testPrefix is used to differentiate between several workers
// running this test to avoid conflicts in instance names
export const testPrefix = () => `t${(Math.random() + 1).toString(36).substring(10)}`

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
        type: 'postgresql',
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
        type: 'pgbouncer',
        replicas: 1,
        expose: {
          type: 'internal',
        },
      },
    },
  },

   postReq = await request.post(`/v1/namespaces/${testsNs}/database-clusters`, { data })

  await checkError(postReq)
}

export const deleteDBCluster = async (request, page, name) => {
  await request.delete(`/v1/namespaces/${testsNs}/database-clusters/${name}`)

  for (let i = 0; i < 100; i++) {
    const cluster = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${name}`)

    if (cluster.status() === 404) {
      return;
    }

    const data = await cluster.json()

    const engineType = data.spec.engine.type === 'postgresql' ? 'pg' : data.spec.engine.type
    // remove finalizers but ignore errors, e.g. if the object is already deleted
    const command = `kubectl patch --namespace ${testsNs} ${engineType} ${name} --type='merge' -p '{"metadata":{"finalizers":null}}' | true`;
    const output = execSync(command).toString();

    await page.waitForTimeout(1000)
  }
}

export const createBackupStorage = async (request, name, namespace) => {
  const storagePayload = {
    type: 's3',
    name,
    url: 'http://custom-url',
    description: 'Dev storage',
    bucketName: suffixedName('percona-test-backup-storage'),
    region: 'us-east-2',
    accessKey: 'sdfs',
    secretKey: 'sdfsdfsd',
    allowedNamespaces: [testsNs],
  },

   response = await request.post(`/v1/namespaces/${namespace}/backup-storages`, { data: storagePayload })

  await checkError(response)
}

export const deleteBackupStorage = async (page, request, name, namespace) => {
  let res = await request.delete(`/v1/namespaces/${namespace}/backup-storages/${name}`)

  if (res.ok()) {
      return;
  }

  for (let i = 0; i < 100; i++) {
    res = await request.delete(`/v1/namespaces/${namespace}/backup-storages/${name}`)
    if (res.ok()) {
        break;
    }

    await page.waitForTimeout(1000)
  }

  checkError(res)
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

export const createMonitoringConfig = async (request, name, namespace) => {
  const miData = {
    type: 'pmm',
    name: name,
    url: `https://${process.env.PMM1_IP}`,
    pmm: {
      apiKey: `${process.env.PMM1_API_KEY}`,
    },
    verifyTLS: false,
  },
   res = await request.post(`/v1/namespaces/${namespace}/monitoring-instances`, { data: miData })

  await checkError(res)
}

export const createDataImporter = async (cli: CliHelper) => {
  let dataImporterPath = 'testdata/dataimporter.yaml'
  await cli.exec(`kubectl apply -f ${dataImporterPath} || true`)
  const out = await cli.execSilent(`kubectl get dataimporters`)
  out.outContains("test-data-importer")
}

export const deleteMonitoringConfig = async (request, name, namespace) => {
  const res = await request.delete(`/v1/namespaces/${namespace}/monitoring-instances/${name}`)

  await checkError(res)
}

export const mockPXCClusterReady = async (cli: CliHelper, clusterName: string) => {
  await cli.exec(`kubectl patch  pxc/${clusterName} --subresource status --namespace ${testsNs} --type='merge' -p '{"status":{"state":"ready"}}'`)
}