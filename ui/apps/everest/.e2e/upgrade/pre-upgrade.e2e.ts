import { expect, test } from '@playwright/test';
import { createDbClusterFn } from '@e2e/utils/db-cluster';
import { pxcDBCluster, mongoDBCluster, postgresDBCluster } from './testData';
import { getDBClustersList } from '@e2e/utils/db-clusters-list';
import { TIMEOUTS } from '@e2e/constants';

test.describe.configure({ retries: 0 });
test.describe.configure({ timeout: TIMEOUTS.FifteenMinutes });

test(
  'Pre upgrade setup',
  { tag: '@pre-upgrade' },
  async ({ page, request }) => {
    await test.step('Create DB clusters', async () => {
      await createDbClusterFn(request, {
        dbName: pxcDBCluster.name,
        dbType: 'mysql',
        numberOfNodes: pxcDBCluster.numberOfNodes,
        numberOfProxies: pxcDBCluster.numberOfProxies,
        cpu: pxcDBCluster.cpu,
        disk: pxcDBCluster.disk,
        memory: pxcDBCluster.memory,
        externalAccess: pxcDBCluster.externalAccess,
        //sourceRanges: pxcDBCluster.sourceRanges,
      });

      await createDbClusterFn(request, {
        dbName: mongoDBCluster.name,
        dbType: 'mongodb',
        numberOfNodes: mongoDBCluster.numberOfNodes,
        cpu: mongoDBCluster.cpu,
        disk: mongoDBCluster.disk,
        memory: mongoDBCluster.disk,
        externalAccess: mongoDBCluster.externalAccess,
      });

      await createDbClusterFn(request, {
        dbName: postgresDBCluster.name,
        dbType: 'postgresql',
        numberOfNodes: postgresDBCluster.numberOfNodes,
        numberOfProxies: postgresDBCluster.numberOfProxies,
        cpu: postgresDBCluster.cpu,
        disk: postgresDBCluster.disk,
        memory: postgresDBCluster.disk,
        externalAccess: postgresDBCluster.externalAccess,
      });

      await page.waitForTimeout(TIMEOUTS.TenSeconds);
    });

    await expect(async () => {
      const dbClusters = (await getDBClustersList(request)).items;

      const clustersInfo = dbClusters.map((c) => {
        return { status: c.status.status, name: c.metadata.name };
      });

      clustersInfo.forEach((c) => {
        expect(c.status, `expecting ${c.name} to have "ready" status`).toBe(
          'ready'
        );
      });
    }, 'waiting for db clusters to be "ready"').toPass({
      timeout: TIMEOUTS.TenMinutes,
      intervals: [TIMEOUTS.OneMinute],
    });
  }
);
