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

import { test, expect } from '@playwright/test';
import { EVEREST_CI_NAMESPACES } from '@e2e/constants';
import { checkAmountOfDbEngines } from '../db-cluster/db-wizard/db-wizard-utils';
import { cancelWizard } from '@e2e/utils/db-wizard';
import { DbEngineType } from '@percona/types';

test.describe('Namespaces DB Wizard', () => {
  test('First step contains only namespaces related to the selected db ', async ({
    page,
  }) => {
    await page.goto('/databases');
    for (let i = 0; i < 3; i++) {
      const dbEnginesButtons = await checkAmountOfDbEngines(page);
      expect(await dbEnginesButtons.count()).toBe(3);
      const dbEngineType = (
        await dbEnginesButtons.nth(i).getAttribute('data-testid')
      )?.split('-')[4];
      await dbEnginesButtons.nth(i).click();
      await page.getByTestId('k8s-namespace-autocomplete').click();

      await expect(
        page.getByRole('option', { name: EVEREST_CI_NAMESPACES.EVEREST_UI })
      ).toBeVisible();
      const dbOnlyNamespace = page.getByRole('option', {
        name: `${dbEngineType === DbEngineType.POSTGRESQL ? 'pg' : dbEngineType}-only`,
      });
      await expect(dbOnlyNamespace).toBeVisible();
      expect(await page.getByRole('option').count()).toBe(2);

      await dbOnlyNamespace.click();

      switch (dbEngineType) {
        case 'pxc': {
          await expect(page.getByTestId('text-input-db-name')).toHaveValue(
            /.*mysql.*/
          );
          break;
        }
        case 'postgresql': {
          await expect(page.getByTestId('text-input-db-name')).toHaveValue(
            /.*postgresql.*/
          );
          break;
        }
        case 'psmdb': {
          await expect(page.getByTestId('text-input-db-name')).toHaveValue(
            /.*mongodb.*/
          );
          break;
        }
        default:
          break;
      }

      await cancelWizard(page);
    }
  });
});
