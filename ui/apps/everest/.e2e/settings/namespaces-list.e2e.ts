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
import { getTokenFromLocalStorage } from '../utils/localStorage';
import { getNamespacesFn } from '../utils/namespaces';
import { EVEREST_CI_NAMESPACES } from '../constants';

test.describe('Namespaces List', () => {
  let namespaces = [];
  test.beforeAll(async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    namespaces = await getNamespacesFn(token, request);
  });

  test('Namespace List displayed', async ({ page }) => {
    await page.goto('/settings/namespaces');
    expect(page.getByText(namespaces[0])).toBeTruthy();
  });

  test('Provisioning of namespaces in CI is working right', async ({
    page,
  }) => {
    await page.goto('/settings/namespaces');
    await expect(page.getByText('Operator')).toBeVisible();
    await expect(page.getByText('No namespaces added')).not.toBeVisible();
    const rows = page.locator('.MuiTableRow-root');
    await expect(
      page.getByText(EVEREST_CI_NAMESPACES.EVEREST_UI)
    ).toBeVisible();
    expect(await rows.count()).toBe(5);
    expect(await page.getByRole('row', { name: 'pxc' }).count()).toBe(2);
    expect(await page.getByRole('row', { name: 'psmdb' }).count()).toBe(2);
    expect(await page.getByRole('row', { name: 'postgresql' }).count()).toBe(2);
  });
});
