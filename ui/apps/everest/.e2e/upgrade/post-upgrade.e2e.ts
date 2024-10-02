import { expect, test } from '@playwright/test';
import fs from 'fs';
import { everestdir, TIMEOUTS } from '@e2e/constants';
import {
  expectedEverestUpgradeLog,
  mongoDBCluster,
  postgresDBCluster,
} from './testData';
import { waitForStatus } from '@e2e/utils/table';
import { getTokenFromLocalStorage } from '@e2e/utils/localStorage';
import { getNamespacesFn } from '@e2e/utils/namespaces';
import { getExpectedOperatorVersions } from "@e2e/upgrade/helper";

let namespace: string;

test.describe('Post upgrade tests', { tag: '@post-upgrade' }, async () => {
  test.beforeAll(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    [namespace] = await getNamespacesFn(token, request);
  });

  test('Verify upgrade.log file', async () => {
    const filePath = `${everestdir}/ui/apps/everest/.e2e/upgrade.log`;
    const data = fs.readFileSync(filePath, 'utf8');

    const expectedText = expectedEverestUpgradeLog();
    expect(data.trim()).toContain(expectedText);
  });

  test('Verify DB clusters are running', async ({ page }) => {
    // go to db list and check status
    await page.goto('/databases');

    await test.step('verify mongoDB and postgresDB clusters are up', async () => {
      await waitForStatus(
        page,
        mongoDBCluster.name,
        'Up',
        TIMEOUTS.ThirtySeconds
      );
      await waitForStatus(
        page,
        postgresDBCluster.name,
        'Up',
        TIMEOUTS.ThirtySeconds
      );
    });
  });

  test('verify user is able to upgrade operators', async ({ page }) => {
    const upgradeOperatorsButton = page.getByRole('button', {
      name: 'Upgrade Operators',
    });
    const upgradeOperatorsModal = page.getByRole('dialog');

    const operatorsVersions = await getExpectedOperatorVersions();

    test.skip(operatorsVersions.length === 0, 'No operators to upgrade');

    await test.step(`open ${namespace} namespace settings`, async () => {
      await page.goto(`/settings/namespaces/${namespace}`);
      await expect(upgradeOperatorsButton).toBeVisible();
    });

    await test.step(`verify "upgrade available" text is present in the header`, async () => {
      for (const operator of operatorsVersions) {
        await expect(
            page.getByText(
                `${operator.shortName} ${operator.oldVersion} (Upgrade available)`
            )
        ).toBeVisible();
      }
    });

    await test.step(`click upgrade button and verify modal contains correct versions and operators`, async () => {
      await upgradeOperatorsButton.click();
      await expect(
          upgradeOperatorsModal.getByText(
              `Are you sure you want to upgrade your operators in ${namespace}?`
          )
      ).toBeVisible();

      for (const operatorVersion of operatorsVersions) {
        await expect(
            upgradeOperatorsModal.locator('li').filter({
              hasText: `${operatorVersion.name} ${operatorVersion.oldVersion} will be upgraded to ${operatorVersion.version}`,
            })
        ).toBeVisible();
      }
    });

    await test.step(`click Upgrade and wait for upgrade success`, async () => {
      await upgradeOperatorsModal
          .getByRole('button', { name: 'Upgrade' })
          .click();

      for (const operator of operatorsVersions) {
        await expect(async () => {
          await expect(
              page.getByText(`${operator.shortName} ${operator.version}`, {
                exact: true,
              })
          ).toBeVisible();
        }).toPass({ timeout: TIMEOUTS.ThreeMinutes });
      }
    });
  });
});
