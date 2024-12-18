import { expect, test } from '@playwright/test';
import fs from 'fs';
import { EVEREST_CI_NAMESPACES, TIMEOUTS } from '@e2e/constants';
import {
  expectedEverestUpgradeLog,
  mongoDBCluster,
  postgresDBCluster,
  pxcDBCluster
} from './testData';
import { waitForStatus } from '@e2e/utils/table';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getNamespacesFn } from '@e2e/utils/namespaces';
import { getExpectedOperatorVersions } from '@e2e/upgrade/helper';
import { getDbAvailableUpgradeVersionK8S } from '@e2e/utils/db-cluster'
import cluster from 'cluster';
import { getDbClustersListAPI } from '@e2e/utils/db-clusters-list';

let namespace: string;
let token: string;
let upgradeClustersInfo: {
  name: string;
  dbType: string;
  upgradeVersion: string | null;
}[] = [];

test.describe('Post upgrade tests', { tag: '@post-upgrade' }, async () => {
  test.describe.configure({ timeout: TIMEOUTS.FifteenMinutes });

  test.beforeAll(async ({ request }) => {
    token = await getTokenFromLocalStorage();
    [namespace] = await getNamespacesFn(token, request);
  });

  // test('Verify upgrade.log file', async () => {
  //   const filePath = `/tmp/everest-upgrade.log`;
  //   const data = fs.readFileSync(filePath, 'utf8');

  //   const expectedText = expectedEverestUpgradeLog();
  //   expect(data.trim()).toContain(expectedText);
  // });

  // test('Verify DB clusters are running', async ({ page }) => {
  //   await page.goto('/databases');

  //   await test.step('Verify MongoDB and Postgresql clusters are up', async () => {
  //     await waitForStatus(page, mongoDBCluster.name, 'Up', TIMEOUTS.ThirtySeconds);
  //     await waitForStatus(page, postgresDBCluster.name, 'Up', TIMEOUTS.ThirtySeconds);
  //     await waitForStatus(page, pxcDBCluster.name, 'Up', TIMEOUTS.ThirtySeconds);
  //   });
  // });

  // test('Verify user is able to upgrade operators', async ({ page }) => {
  //   const upgradeOperatorsButton = page.getByRole('button', {
  //     name: 'Upgrade Operators',
  //   });
  //   const upgradeOperatorsModal = page.getByRole('dialog');

  //   const operatorsVersions = await getExpectedOperatorVersions();

  //   test.skip(operatorsVersions.length === 0, 'No operators to upgrade');

  //   await test.step(`open ${namespace} namespace settings`, async () => {
  //     await page.goto(`/settings/namespaces/${namespace}`);
  //     await expect(upgradeOperatorsButton).toBeVisible();
  //   });

  //   await test.step(`Verify "upgrade available" text is present in the header`, async () => {
  //     for (const operator of operatorsVersions) {
  //       await expect(
  //         page.getByText(
  //           `${operator.shortName} ${operator.oldVersion} (Upgrade available)`
  //         )
  //       ).toBeVisible();
  //     }
  //   });

  //   await test.step(`Click upgrade button and verify modal contains correct versions and operators`, async () => {
  //     await upgradeOperatorsButton.click();
  //     await expect(
  //       upgradeOperatorsModal.getByText(
  //         `Are you sure you want to upgrade your operators in ${namespace}?`
  //       )
  //     ).toBeVisible();

  //     for (const operatorVersion of operatorsVersions) {
  //       await expect(
  //         upgradeOperatorsModal.locator('li').filter({
  //           hasText: `${operatorVersion.name} ${operatorVersion.oldVersion} will be upgraded to ${operatorVersion.version}`,
  //         })
  //       ).toBeVisible();
  //     }
  //   });

  //   await test.step(`Click Upgrade and wait for upgrade success`, async () => {
  //     await upgradeOperatorsModal
  //       .getByRole('button', { name: 'Upgrade' })
  //       .click();

  //     for (const operator of operatorsVersions) {
  //       await expect(async () => {
  //         await expect(
  //           page.getByText(`${operator.shortName} ${operator.version}`, {
  //             exact: true,
  //           })
  //         ).toBeVisible();
  //       }).toPass({ timeout: TIMEOUTS.ThreeMinutes });
  //     }
  //   });

  //   await test.step(`Verify CRD upgrade is available`, async () => {
  //     for (const operator of operatorsVersions) {
  //       await expect(async () => {
  //         await expect(
  //           page.getByText(`Database needs restart to use CRVersion '${operator.version}'`, {
  //             exact: true,
  //           })
  //         ).toBeVisible();
  //       }).toPass({ timeout: TIMEOUTS.ThreeMinutes });
  //     }
  //   });

  //   await test.step(`Upgrade CRD for each database`, async () => {
  //     for (const operator of operatorsVersions) {
  //       const upgradeCRDModal = page.getByRole('dialog');

  //       await upgradeCRDModal
  //       .getByRole('button', { name: `Database needs restart to use CRVersion '${operator.version}'` })
  //       .click();

  //       await expect(
  //         upgradeCRDModal.getByText(
  //           `Are you sure you want to upgrade your CRD (Custom Resource Definition) to version ${operator.version} in ${operator.shortName}-db-cluster cluster`
  //         )
  //       ).toBeVisible();

  //       await upgradeCRDModal.getByRole('button', { name: 'Upgrade' }).click();
  //     }

  //     for (const operator of operatorsVersions) {
  //       await waitForStatus(page, `${operator.shortName}-db-cluster`, 'Up', TIMEOUTS.ThreeMinutes);
  //     }
  //   });
  // });

  test('Verify user is able to upgrade databases', async ({ page, request }) => {
    const dbClusters = (await getDbClustersListAPI(EVEREST_CI_NAMESPACES.EVEREST_UI, request, token)).items;

    upgradeClustersInfo = dbClusters.map((c) => {
      return { name: c.metadata.name, dbType: c.spec.engine.type };
    });

    for (const c of upgradeClustersInfo) {
      c.upgradeVersion = await getDbAvailableUpgradeVersionK8S(`${c.dbType}-db-cluster`, EVEREST_CI_NAMESPACES.EVEREST_UI, request, token);
    }
    const upgradeCount = upgradeClustersInfo.filter((item) => item.upgradeVersion !== null).length;

    test.skip(upgradeCount === 0, 'No databases to upgrade');

    // await test.step(`open ${namespace} namespace settings`, async () => {
    //   await page.goto(`/settings/namespaces/${namespace}`);
    //   await expect(upgradeOperatorsButton).toBeVisible();
    // });

    // await test.step(`Verify "upgrade available" text is present in the header`, async () => {
    //   for (const operator of operatorsVersions) {
    //     await expect(
    //       page.getByText(
    //         `${operator.shortName} ${operator.oldVersion} (Upgrade available)`
    //       )
    //     ).toBeVisible();
    //   }
    // });

    // await test.step(`Click upgrade button and verify modal contains correct versions and operators`, async () => {
    //   await upgradeOperatorsButton.click();
    //   await expect(
    //     upgradeOperatorsModal.getByText(
    //       `Are you sure you want to upgrade your operators in ${namespace}?`
    //     )
    //   ).toBeVisible();

    //   for (const operatorVersion of operatorsVersions) {
    //     await expect(
    //       upgradeOperatorsModal.locator('li').filter({
    //         hasText: `${operatorVersion.name} ${operatorVersion.oldVersion} will be upgraded to ${operatorVersion.version}`,
    //       })
    //     ).toBeVisible();
    //   }
    // });

    // await test.step(`Click Upgrade and wait for upgrade success`, async () => {
    //   await upgradeOperatorsModal
    //     .getByRole('button', { name: 'Upgrade' })
    //     .click();

    //   for (const operator of operatorsVersions) {
    //     await expect(async () => {
    //       await expect(
    //         page.getByText(`${operator.shortName} ${operator.version}`, {
    //           exact: true,
    //         })
    //       ).toBeVisible();
    //     }).toPass({ timeout: TIMEOUTS.ThreeMinutes });
    //   }
    // });
  });
});
