import { expect, test } from '@playwright/test';
import { createDbClusterFn } from '../utils/db-cluster';
import { mongoDBCluster, postgresDBCluster, psDBCluster } from './testData';
import { getDBClustersList } from '../utils/db-clusters-list';
import { TIMEOUT } from '../constants';

test.describe.configure({ retries: 0 });
test(
  'Pre upgrade setup',
  { tag: '@pre-upgrade' },
  async ({ page, request }) => {
    await createDbClusterFn(request, {
      dbName: psDBCluster.name,
      dbType: 'mysql',
      numberOfNodes: psDBCluster.numberOfNodes,
      cpu: psDBCluster.cpu,
      disk: psDBCluster.disk,
      memory: psDBCluster.memory,
      externalAccess: psDBCluster.externalAccess,
      sourceRanges: psDBCluster.sourceRanges,
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
      cpu: postgresDBCluster.cpu,
      disk: postgresDBCluster.disk,
      memory: postgresDBCluster.disk,
      externalAccess: postgresDBCluster.externalAccess,
    });

    await page.waitForTimeout(TIMEOUT.TenSeconds);
    let clusters = (await getDBClustersList(request)).items;
    console.log(clusters);

    await expect
      .soft(async () => {
        const dbClusters = (await getDBClustersList(request)).items;

        const clustersInfo = dbClusters.map((c) => {
          return { status: c.status.status, name: c.metadata.name };
        });

        clustersInfo.forEach((c) => {
          expect
            .soft(c.status, `expecting ${c.name} to have "ready" status`)
            .toBe('ready');
        });
      })
      .toPass({
        timeout: TIMEOUT.TenMinutes,
        intervals: [TIMEOUT.OneMinute],
      });

    expect.soft(clusters.length).toBeTruthy();

    clusters = (await getDBClustersList(request)).items;
    console.log(clusters);
  }
);
