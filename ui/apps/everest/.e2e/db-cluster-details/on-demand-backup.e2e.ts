import { expect, test } from '@playwright/test';
import { gotoDbClusterBackups } from '../utils/db-clusters-list';
import { createDbClusterFn } from '../utils/db-cluster';
import { clickOnDemandBackup } from './utils';

test.describe('On-demand backup', async () => {
  const mySQLName = 'on-demand-mysql';

  test.beforeAll(async ({ request }) => {
    await createDbClusterFn(request, {
      dbName: mySQLName,
      dbType: 'mysql',
      numberOfNodes: '1',
      backup: {
        enabled: true,
        schedules: [],
      },
    });
  });

  test('Non-empty backup storage', async ({ page }) => {
    await gotoDbClusterBackups(page, mySQLName);
    await clickOnDemandBackup(page);
    await expect(page.getByTestId('text-input-name')).not.toBeEmpty();
    await expect(
      page.getByTestId('text-input-storage-location')
    ).not.toBeEmpty();
  });
});
