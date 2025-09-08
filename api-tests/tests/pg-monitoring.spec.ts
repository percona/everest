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
import * as th from "@tests/tests/helpers";

const testPrefix = 'pg-mon',
  monitoringConfigName1 = th.limitedSuffixedName(testPrefix + '-m1'),
  monitoringConfigName2 = th.limitedSuffixedName(testPrefix + '-m2')

test.describe('PG monitoring tests', {tag: ['@pg', '@monitoring']}, () => {
  test.describe.configure({ timeout: 120 * 1000 });

  test.beforeAll(async ({ request }) => {
    await th.createMonitoringConfig(request, monitoringConfigName1)
    await th.createMonitoringConfig(request, monitoringConfigName2)
  })

  test.afterAll(async ({ request }) => {
    await th.deleteMonitoringConfig(request, monitoringConfigName1)
    await th.deleteMonitoringConfig(request, monitoringConfigName2)
  })

  test('create db cluster with monitoring config', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix)
    let dbClusterData = th.getPGClusterDataSimple(dbClusterName)
    dbClusterData.spec.monitoring = {monitoringConfigName: monitoringConfigName1}

    try {
      await test.step('create db cluster with monitoring config', async () => {
        await th.createDBClusterWithData(request, dbClusterData)

        await expect(async () => {
          const dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster.spec.monitoring.monitoringConfigName).toBe(monitoringConfigName1)
        }).toPass({
          intervals: [1000],
          timeout: 300 * 1000,
        })
      })
    } finally {
      await th.deleteDBCluster(request, dbClusterName)
    }
  })

  test('create db cluster with invalid monitoring config', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix + '-inv')
    let dbClusterData = th.getPGClusterDataSimple(dbClusterName)
    dbClusterData.spec.monitoring = {monitoringConfigName: 'absent-config'}

    try{
    await test.step('create db cluster with monitoring config', async () => {
      await th.createDBClusterWithData(request, dbClusterData)

      await expect(async () => {
        const dbCluster = await th.getDBCluster(request, dbClusterName)
        expect(dbCluster.spec.monitoring.monitoringConfigName).toBe(dbClusterData.spec.monitoring.monitoringConfigName)
        expect(dbCluster.status.status).toMatch('creating')
        expect(dbCluster.status.size).toBeFalsy()
      }).toPass({
        intervals: [1000],
        timeout: 120 * 1000,
      })
    })
    } finally {
      await th.deleteDBCluster(request, dbClusterName)
    }
  })

  test('update db cluster with a new monitoring config', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix + '-upd')
    let dbClusterData = th.getPGClusterDataSimple(dbClusterName)
    dbClusterData.spec.monitoring = {monitoringConfigName: monitoringConfigName1}

    try {
      let dbCluster
      await test.step('create DB cluster with monitoring config 1', async () => {
        await th.createDBClusterWithData(request, dbClusterData)

        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster.spec.monitoring.monitoringConfigName).toBe(monitoringConfigName1)
        }).toPass({
          intervals: [1000],
          timeout: 300 * 1000,
        })
      })

      await test.step('set new monitoring config 2', async () => {
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.monitoring.monitoringConfigName = monitoringConfigName2

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster.spec.monitoring.monitoringConfigName).toBe(monitoringConfigName2)
        }).toPass({
          intervals: [1000],
          timeout: 300 * 1000,
        })
      })
    } finally {
      await th.deleteDBCluster(request, dbClusterName)
    }
  })

  test('update db cluster without monitoring config with a new monitoring config', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix),
      dbClusterData = th.getPGClusterDataSimple(dbClusterName)

    try {
      let dbCluster

      await test.step('create DB cluster without monitoring config', async () => {
        await th.createDBClusterWithData(request, dbClusterData)

        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster.spec.monitoring?.monitoringConfigName).toBeFalsy()
        }).toPass({
          intervals: [1000],
          timeout: 300 * 1000,
        })
      })

      await test.step('set new monitoring config', async () => {
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
        dbCluster.spec.monitoring = {monitoringConfigName: monitoringConfigName1}

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster.spec.monitoring.monitoringConfigName).toBe(monitoringConfigName1)
        }).toPass({
          intervals: [1000],
          timeout: 300 * 1000,
        })
      })

    } finally {
      await th.deleteDBCluster(request, dbClusterName)
    }
  })

  test('disable monitoring config', async ({request}) => {
    const dbClusterName = th.limitedSuffixedName(testPrefix + '-dis')
    let dbClusterData = th.getPGClusterDataSimple(dbClusterName)
    dbClusterData.spec.monitoring = {monitoringConfigName: monitoringConfigName1}

    try {
      let dbCluster

      await test.step('create DB cluster with monitoring config', async () => {
        await th.createDBClusterWithData(request, dbClusterData)

        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster.spec.monitoring.monitoringConfigName).toBe(monitoringConfigName1)
        }).toPass({
          intervals: [1000],
          timeout: 300 * 1000,
        })
      })

      await test.step('disable monitoring', async () => {
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.monitoring = {}

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster.spec.monitoring?.monitoringConfigName).toBeFalsy()
        }).toPass({
          intervals: [1000],
          timeout: 300 * 1000,
        })
      })
    } finally {
      await th.deleteDBCluster(request, dbClusterName)
    }
  })
});