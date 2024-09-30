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
import { EVEREST_CI_NAMESPACES } from '../../constants';

test.describe('Namespaces DB Wizard', () => {
  test('Changing of the namespace cause update of dbEngines, dbVersions, dbName', async ({
    page,
  }) => {
    await page.goto('/databases');
    const button = page.getByTestId('add-db-cluster-button');
    await button.click();

    // setting everest-pxc namespace
    const namespacesList = page.getByTestId('k8s-namespace-autocomplete');
    await namespacesList.click();

    await page
      .getByRole('option', { name: EVEREST_CI_NAMESPACES.PXC_ONLY })
      .click();

    await expect(page.getByTestId('mysql-toggle-button')).toBeVisible();
    // checking and saving fields for pxc
    const dbEnginesButtons = page
      .getByTestId('toggle-button-group-input-db-type')
      .getByRole('button');
    expect(await dbEnginesButtons.count()).toBe(1);
    await expect(page.getByTestId('mysql-toggle-button')).toBeVisible();
    await expect(page.getByTestId('mongodb-toggle-button')).not.toBeVisible();
    await expect(
      page.getByTestId('postgresql-toggle-button')
    ).not.toBeVisible();
    await expect(page.getByTestId('text-input-db-name')).toHaveValue(
      /.*mysql.*/
    );

    const dbVersion = await page
      .getByTestId('select-input-db-version')
      .inputValue();

    //changing namespace to everest-psmdb
    await namespacesList.click();
    await page
      .getByRole('option', { name: EVEREST_CI_NAMESPACES.PSMDB_ONLY })
      .click();

    // checking changes of all fields
    await expect(page.getByTestId('mongodb-toggle-button')).toBeVisible();
    await expect(
      page.getByTestId('postgresql-toggle-button')
    ).not.toBeVisible();
    await expect(page.getByTestId('mysql-toggle-button')).not.toBeVisible();
    await expect(page.getByTestId('text-input-db-name')).toHaveValue(
      /.*mongodb.*/
    );

    expect(
      await page.getByTestId('select-input-db-version').inputValue()
    ).not.toBe(dbVersion);
  });
});
