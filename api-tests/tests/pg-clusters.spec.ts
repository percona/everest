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
import * as th from "@tests/tests/helpers";

const testPrefix = 'pg'

test.describe('PG cluster tests', {tag: ['@pg']}, () => {
  test.describe.configure({ timeout: 120 * 1000 });

  test('create/scale/expose/delete single node pg cluster', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix + '-sin')
    let dbClusterPayload = th.getPGClusterDataSimple(dbClusterName)
    let dbCluster

    try {
      await test.step('create DB cluster', async () => {
        await th.createDBClusterWithData(request, dbClusterPayload)

        // Wait for DB cluster creation.
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster.spec).toMatchObject(dbClusterPayload.spec)
        }).toPass({
          intervals: [1000],
          timeout: 30 * 1000,
        })
      })

      await test.step('scale up DB cluster (engine=2, proxy=2)', async () => {
        await expect(async () => {
          const dbEngineReplicas = 2
          const dbProxyReplicas = 2
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.engine.replicas = dbEngineReplicas
          dbCluster.spec.proxy.replicas = dbProxyReplicas

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster.spec.engine.replicas).toBe(dbEngineReplicas)
          expect(dbCluster.spec.proxy.replicas).toBe(dbProxyReplicas)
        }).toPass({
          intervals: [1000],
          timeout: 30 * 1000,
        })
      })

      await test.step('expose DB cluster', async () => {
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.proxy.expose.type = 'external'

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster.spec.proxy.expose.type).toMatch('external')
        }).toPass({
          intervals: [1000],
          timeout: 30 * 1000,
        })
      })

      await test.step('delete DB cluster', async () => {
        await th.deleteDBCluster(request, dbClusterName)
      });

    } finally {
      await th.deleteDBCluster(request, dbClusterName)
    }
  })

  test('create/scale/expose/delete multi node pg cluster', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix + '-mul')
    let dbClusterPayload = th.getPGClusterDataSimple(dbClusterName)
    dbClusterPayload.spec.engine.replicas = 3
    dbClusterPayload.spec.proxy.replicas = 3
    let dbCluster

    try {
      await test.step('create DB cluster(engine=3, proxy=3)', async () => {
        await th.createDBClusterWithData(request, dbClusterPayload)

        // Wait for DB cluster creation.
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster.spec).toMatchObject(dbClusterPayload.spec)
        }).toPass({
          intervals: [1000],
          timeout: 30 * 1000,
        })
      })

      await test.step('scale up DB cluster(engine=4, proxy=4)', async () => {
        await expect(async () => {
          const dbEngineReplicas = 4
          const dbProxyReplicas = 4
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.engine.replicas = dbEngineReplicas
          dbCluster.spec.proxy.replicas = dbProxyReplicas

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster.spec.engine.replicas).toBe(dbEngineReplicas)
          expect(dbCluster.spec.proxy.replicas).toBe(dbProxyReplicas)
        }).toPass({
          intervals: [1000],
          timeout: 30 * 1000,
        })
      })

      await test.step('expose DB cluster', async () => {
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.proxy.expose.type = 'external'

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster.spec.proxy.expose.type).toMatch('external')
        }).toPass({
          intervals: [1000],
          timeout: 30 * 1000,
        })
      })

      await test.step('delete DB cluster', async () => {
        await th.deleteDBCluster(request, dbClusterName)
      });

    } finally {
      await th.deleteDBCluster(request, dbClusterName)
    }
  })
});