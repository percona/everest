// percona-everest-frontend
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

import { test as setup, expect } from '@playwright/test';
import { getTokenFromLocalStorage } from './utils/localStorage';

setup.describe.serial('Teardown', () => {
  setup('Delete backup storage', async ({ request }) => {
    const token = await getTokenFromLocalStorage();
    const response = await request.delete('/v1/backup-storages/ui-dev', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(response.ok()).toBeTruthy();
  });

  // setup('Delete monitoring instances', async ({ request }) => {
  //   await deleteMonitoringInstance(request, testMonitoringName);
  //   await deleteMonitoringInstance(request, testMonitoringName2);
  // });

  setup('Logout', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('user-appbar-button').click();
    await page.getByRole('menuitem').filter({ hasText: 'Log out' }).click();

    await expect(page.getByTestId('login-button')).toBeVisible();
  });
});
