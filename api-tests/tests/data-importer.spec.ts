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
  waitClusterDeletion,
  deleteDBCluster,
  createDataImporter,
  mockPXCClusterReady
} from '@tests/tests/helpers';

test.setTimeout(360 * 1000)

test.beforeEach(async ({ request, cli }) => {
    await createDataImporter(cli)
})


test('list data importer', async ({ request, page, cli }) => {
    let res = await request.get(`/v1/data-importers`)
    await checkError(res)
    
    let list = await res.json()
    expect(list.items?.length).toBe(4)
    expect(list.items.some((item: any) => item.metadata.name === 'test-data-importer')).toBe(true)
})

test('import data into fresh cluster', async ({ request, page, cli }) => {
  const clusterName = 'test-db-import',
   data = {
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
        storage: {
          size: '4Gi',
        },
        resources: {
          cpu: '1',
          memory: '1G',
        },
      },
      dataSource: {
        dataImport: {
            dataImporterName: 'test-data-importer',
            source: {
                path: "test.sql",
                s3: {
                    bucket: "test-bucket",
                    region: "us-west-2",
                    endpointURL: "https://s3.us-west-2.amazonaws.com",
                    credentialsSecretName: "test-s3-credentials",
                    // everest-operator will hide this behind a Secret
                    accessKeyId: "test-access-key-id",
                    secretAccessKey: "test-secret-access-key",
                },
            },
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
  },

  postReq = await request.post(`/v1/namespaces/${testsNs}/database-clusters`, { data })
  await checkError(postReq)

  // mock that the PXC cluster is ready so the data import job can start.
  await mockPXCClusterReady(cli, clusterName)


  // assert that we see the importing status
  await expect(async () => {
      const dbReq = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}`)
      checkError(dbReq)
      const db = await dbReq.json()
      expect(db?.status?.status).toBe('importing')
  }).toPass({
    intervals: [5000],
    timeout: 300 * 1000,
  })
  
  // Get the DataImportJob for the cluster and check it is Running
  const dijReq = await request.get(`/v1/namespaces/${testsNs}/database-clusters/${clusterName}/data-import-jobs`)
  checkError(dijReq)
  const dijList = await dijReq.json()
  expect(dijList?.items?.length).toBe(1)
  const dij = dijList.items[0]
  expect(dij?.status?.state).toBe('Running')
  
  await deleteDBCluster(request, page, clusterName)
  await waitClusterDeletion(request, page, clusterName)
})