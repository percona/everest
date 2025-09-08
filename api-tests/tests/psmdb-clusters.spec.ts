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

const testPrefix = 'psmdb'

test.describe('PSMDB cluster tests', {tag: ['@psmdb']}, () => {
  test.describe.configure({ timeout: 120 * 1000 });

  test('create/scale/delete single node psmdb cluster', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix + '-sin')
    let dbClusterPayload = th.getPSMDBClusterDataSimple(dbClusterName)
    let dbCluster

    try {
      await test.step('create DB cluster', async () => {
        await th.createDBClusterWithData(request, dbClusterPayload)

        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster.spec).toMatchObject(dbClusterPayload.spec)
        }).toPass({
          intervals: [1000],
          timeout: 30 * 1000,
        })
      })

      await test.step('scale up DB cluster (engine=3)', async () => {
        const dbEngineReplicas = 3
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.engine.replicas = dbEngineReplicas

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster.spec.engine.replicas).toBe(dbEngineReplicas)
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

  test('create/scale/delete single node sharded psmdb cluster', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix + '-sin-shrd')
    let dbClusterPayload = th.getPSMDBClusterDataSimple(dbClusterName)
    dbClusterPayload.spec.sharding.enabled = true
    dbClusterPayload.spec.engine.version = await th.getPSMDBEngineRecommendedVersion(request)
    let dbCluster

    try {
      await test.step('create DB cluster', async () => {
        await th.createDBClusterWithData(request, dbClusterPayload)

        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster.spec).toMatchObject(dbClusterPayload.spec)
        }).toPass({
          intervals: [1000],
          timeout: 30 * 1000,
        })
      })

      await test.step('scale up DB cluster (engine=3)', async () => {
        const dbEngineReplicas = 3
        const dbProxyReplicas = 1
        const dbCfgReplicas = 3
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.engine.replicas = dbEngineReplicas
          dbCluster.spec.proxy.replicas = dbProxyReplicas
          dbCluster.spec.sharding.configServer.replicas = dbCfgReplicas

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster.spec.engine.replicas).toBe(dbEngineReplicas)
          expect(dbCluster.spec.proxy.replicas).toBe(dbProxyReplicas)
          expect(dbCluster.spec.sharding.configServer.replicas).toBe(dbCfgReplicas)
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

  test('create/scale/delete multi node psmdb cluster', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix + '-mul')
    let dbClusterPayload = th.getPSMDBClusterDataSimple(dbClusterName)
    dbClusterPayload.spec.engine.replicas = 3
    let dbCluster

    try {
      await test.step('create DB cluster(engine=3)', async () => {
        await th.createDBClusterWithData(request, dbClusterPayload)

        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster.spec).toMatchObject(dbClusterPayload.spec)
        }).toPass({
          intervals: [1000],
          timeout: 30 * 1000,
        })
      })

      await test.step('scale up DB cluster(engine=5)', async () => {
        const dbEngineReplicas = 5
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.engine.replicas = dbEngineReplicas

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster.spec.engine.replicas).toBe(dbEngineReplicas)
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

  test('create/scale/delete multi node sharded psmdb cluster', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix + '-sin-shrd')
    let dbClusterPayload = th.getPSMDBClusterDataSimple(dbClusterName)
    dbClusterPayload.spec.sharding.enabled = true
    dbClusterPayload.spec.sharding.configServer.replicas = 3
    dbClusterPayload.spec.engine.replicas = 3
    dbClusterPayload.spec.proxy.replicas = 3
    dbClusterPayload.spec.engine.version = await th.getPSMDBEngineRecommendedVersion(request)
    let dbCluster

    try {
      await test.step('create DB cluster(engine=3, proxy=3, cfgServer=3)', async () => {
        await th.createDBClusterWithData(request, dbClusterPayload)

        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster.spec).toMatchObject(dbClusterPayload.spec)
        }).toPass({
          intervals: [1000],
          timeout: 30 * 1000,
        })
      })

      await test.step('scale up DB cluster (engine=5, proxy=5, cfgServer=5)', async () => {
        const dbEngineReplicas = 5
        const dbProxyReplicas = 5
        const dbCfgReplicas = 5
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.engine.replicas = dbEngineReplicas
          dbCluster.spec.proxy.replicas = dbProxyReplicas
          dbCluster.spec.sharding.configServer.replicas = dbCfgReplicas

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster.spec.engine.replicas).toBe(dbEngineReplicas)
          expect(dbCluster.spec.proxy.replicas).toBe(dbProxyReplicas)
          expect(dbCluster.spec.sharding.configServer.replicas).toBe(dbCfgReplicas)
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