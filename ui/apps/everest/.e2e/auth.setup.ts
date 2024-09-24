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

import { expect, test as setup } from '@playwright/test';
import { STORAGE_STATE_FILE } from './constants';
const { CI_USER, CI_PASSWORD } = process.env;

setup('Login', async ({ page }) => {
  page.goto('/login');
  await page.getByTestId('text-input-username').fill(CI_USER);
  await page.getByTestId('text-input-password').fill(CI_PASSWORD);
  await page.getByTestId('login-button').click();
  await expect(page.getByText('Create database')).toBeVisible();

  const origins = (await page.context().storageState()).origins;
  expect(origins.length).toBeGreaterThan(0);
  expect(
    origins.find(
      (origin) =>
        !!origin.localStorage.find((storage) => storage.name === 'everestToken')
    )
  ).not.toBeUndefined();
  await page.context().storageState({ path: STORAGE_STATE_FILE });
});
