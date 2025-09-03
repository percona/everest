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

const dbClusterNamePrefix = 'pg-mon',
  monitoringConfigName1 = th.limitedSuffixedName(dbClusterNamePrefix + '-m1'),
  monitoringConfigName2 = th.limitedSuffixedName(dbClusterNamePrefix + '-m2')
test.beforeAll(async ({ request }) => {
  await th.createMonitoringConfig(request, monitoringConfigName1)
  await th.createMonitoringConfig(request, monitoringConfigName2)
})

test.afterAll(async ({ request }) => {
  await th.deleteMonitoringConfig(request, monitoringConfigName1)
  await th.deleteMonitoringConfig(request, monitoringConfigName2)
})

test.describe('PG monitoring tests', {tag: ['@pg', '@monitoring']}, () => {
  test.setTimeout(360 * 1000)

  test('create db cluster with invalid monitoring config', async ({request, page}) => {
    const dbClusterName = th.limitedSuffixedName(dbClusterNamePrefix)
    let dbClusterData = th.getPGClusterDataSimple(dbClusterName)
    dbClusterData.spec.monitoring = {monitoringConfigName: 'absent-config'}

    try{
    await test.step('create DB cluster', async () => {
      await th.createDBClusterWithData(request, dbClusterData)

      await expect(async () => {
        const dbCluster = await th.getDBCluster(request, dbClusterName)
        expect(dbCluster?.status?.status).toMatch('creating')
        expect(dbCluster?.status?.size).toBeFalsy()
      }).toPass({
        intervals: [1000],
        timeout: 60 * 1000,
      })
    })
    } finally {
      await th.deleteDBCluster(request, page, dbClusterName)
    }
  })

  test('create db cluster with monitoring config', async ({request, page}) => {
    const dbClusterName = th.limitedSuffixedName(dbClusterNamePrefix)
    let dbClusterData = th.getPGClusterDataSimple(dbClusterName)
    dbClusterData.spec.monitoring = {monitoringConfigName: monitoringConfigName1}

    try {
      await test.step('create DB cluster', async () => {
        await th.createDBClusterWithData(request, dbClusterData)

        // Wait for DB cluster creation (at least 1 node is up).
        await expect(async () => {
          const dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster?.status?.size).toBeGreaterThanOrEqual(1)
          expect(dbCluster?.spec?.monitoring?.monitoringConfigName).toBe(monitoringConfigName1)
        }).toPass({
          intervals: [1000],
          timeout: 120 * 1000,
        })
      })
    } finally {
      await th.deleteDBCluster(request, page, dbClusterName)
    }
  })

  test('update db cluster with a new monitoring config', async ({request, page}) => {
    const dbClusterName = th.limitedSuffixedName(dbClusterNamePrefix)
    let dbClusterData = th.getPGClusterDataSimple(dbClusterName)
    dbClusterData.spec.monitoring = {monitoringConfigName: monitoringConfigName1}

    try {
      let dbCluster
      await test.step('create DB cluster', async () => {
        await th.createDBClusterWithData(request, dbClusterData)

        // Wait for DB cluster creation (at least 1 node is up).
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster?.status?.size).toBeGreaterThanOrEqual(1)
          expect(dbCluster?.spec?.monitoring?.monitoringConfigName).toBe(monitoringConfigName1)
        }).toPass({
          intervals: [1000],
          timeout: 120 * 1000,
        })
      })

      await test.step('set new monitoring config', async () => {
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.monitoring.monitoringConfigName = monitoringConfigName2

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster?.spec?.monitoring?.monitoringConfigName).toBe(monitoringConfigName2)
        }).toPass({
          intervals: [1000],
          timeout: 120 * 1000,
        })
      })
    } finally {
      await th.deleteDBCluster(request, page, dbClusterName)
    }
  })

  test('update db cluster without monitoring config with a new monitoring config', async ({request, page}) => {
    const dbClusterName = th.limitedSuffixedName(dbClusterNamePrefix)
    let dbClusterData = th.getPGClusterDataSimple(dbClusterName)

    try {
      let dbCluster

      await test.step('create DB cluster', async () => {
        await th.createDBClusterWithData(request, dbClusterData)

        // Wait for DB cluster creation (at least 1 node is up).
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster?.status?.size).toBeGreaterThanOrEqual(1)
          expect(dbCluster?.spec?.monitoring?.monitoringConfigName).toBeFalsy()
        }).toPass({
          intervals: [1000],
          timeout: 120 * 1000,
        })
      })

      await test.step('set new monitoring config', async () => {
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.monitoring = {monitoringConfigName: monitoringConfigName1}

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster?.spec?.monitoring?.monitoringConfigName).toBe(monitoringConfigName1)
        }).toPass({
          intervals: [1000],
          timeout: 120 * 1000,
        })
      })

    } finally {
      await th.deleteDBCluster(request, page, dbClusterName)
    }
  })

  test('disable monitoring config', async ({request, page}) => {
    const dbClusterName = th.limitedSuffixedName(dbClusterNamePrefix)
    let dbClusterData = th.getPGClusterDataSimple(dbClusterName)
    dbClusterData.spec.monitoring = {monitoringConfigName: monitoringConfigName1}

    try {
      let dbCluster

      await test.step('create DB cluster', async () => {
        await th.createDBClusterWithData(request, dbClusterData)

        // Wait for DB cluster creation (at least 1 node is up).
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          expect(dbCluster?.status?.size).toBeGreaterThanOrEqual(1)
          expect(dbCluster?.spec?.monitoring?.monitoringConfigName).toBe(monitoringConfigName1)
        }).toPass({
          intervals: [1000],
          timeout: 120 * 1000,
        })
      })

      await test.step('disable monitoring', async () => {
        await expect(async () => {
          dbCluster = await th.getDBCluster(request, dbClusterName)
          dbCluster.spec.monitoring = {}

          dbCluster = await th.updateDBCluster(request, dbClusterName, dbCluster)
          expect(dbCluster?.spec?.monitoring?.monitoringConfigName).toBeFalsy()
        }).toPass({
          intervals: [1000],
          timeout: 120 * 1000,
        })
      })
    } finally {
      await th.deleteDBCluster(request, page, dbClusterName)
    }
  })
});