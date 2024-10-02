import { expect, request, test } from '@playwright/test';
import fs from 'fs';
import yaml from 'yaml';
import { everestdir, everestTagForUpgrade, TIMEOUTS } from '@e2e/constants';
import { expectedEverestUpgradeLog, mongoDBCluster, postgresDBCluster, } from './testData';
import { waitForStatus } from '@e2e/utils/table';
import * as process from 'process';
import { mapper } from '@e2e/utils/mapper';
import { getTokenFromLocalStorage } from "@e2e/utils/localStorage";
import { getNamespacesFn } from "@e2e/utils/namespaces";

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
    type OperatorVersions = {
      name: string;
      shortName: string;
      version: string;
      oldVersion: string;
    };

    enum Operator {
      PXC = 'percona-xtradb-cluster-operator',
      PSMDB = 'percona-server-mongodb-operator',
      PG = 'percona-postgresql-operator',
    }

    const operatorVersionsVariables = new Map();
    operatorVersionsVariables.set(Operator.PXC, 'PXC_OPERATOR_VERSION');
    operatorVersionsVariables.set(Operator.PSMDB, 'PSMDB_OPERATOR_VERSION');
    operatorVersionsVariables.set(Operator.PG, 'POSTGRESQL_OPERATOR_VERSION');

    const getOperatorShortName = mapper<Operator>({
      _default: 'unknown',
      [Operator.PXC]: 'pxc',
      [Operator.PSMDB]: 'psmdb',
      [Operator.PG]: 'postgresql',
    });

    const getExpectedOperatorVersions = async () => {
      const allVersions: OperatorVersions[] = [];
      for (const operator of Object.values(Operator)) {
        const apiRequest = await request.newContext();
        const yamlUrl = `https://raw.githubusercontent.com/percona/everest-catalog/${everestTagForUpgrade}/veneer/${operator}.yaml`;
        const response = await apiRequest.get(yamlUrl);
        const yamlContent = await response.text();
        const parsedYaml = yaml.parse(yamlContent);

        const fastBundlesImages = parsedYaml.Stable.Bundles.map(
          (bundle) => bundle.Image
        );

        const lastImageTag = fastBundlesImages[fastBundlesImages.length - 1];
        const versionMatch = lastImageTag.match(/:(?:v)?(\d+\.\d+\.\d+)/);
        const version = versionMatch ? versionMatch[1] : null;
        const oldVersion = process.env[operatorVersionsVariables.get(operator)];

        if (oldVersion !== version) {
          allVersions.push({
            name: operator,
            shortName: getOperatorShortName(operator),
            version: `v${version}`,
            oldVersion: `v${oldVersion}`,
          });
        }
      }

      return allVersions;
    };

    const operatorsVersions = await getExpectedOperatorVersions();

    test.skip(operatorsVersions.length === 0, 'No operators to upgrade');

    await page.goto(`/settings/namespaces/${namespace}`);

    const upgradeOperatorsButton = page.getByRole('button', {
      name: 'Upgrade Operators',
    });
    const upgradeOperatorsModal = page.getByRole('dialog');

    await expect(upgradeOperatorsButton).toBeVisible();

    for (const operator of operatorsVersions) {
      await expect(
        page.getByText(
          `${operator.shortName} ${operator.oldVersion} (Upgrade available)`
        )
      ).toBeVisible();
    }

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
