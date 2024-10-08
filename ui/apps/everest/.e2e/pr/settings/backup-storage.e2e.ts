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
import { findRowAndClickActions } from '@e2e/utils/table';
const {
  EVEREST_LOCATION_BUCKET_NAME,
  EVEREST_LOCATION_ACCESS_KEY,
  EVEREST_LOCATION_SECRET_KEY,
  EVEREST_LOCATION_REGION,
  EVEREST_LOCATION_URL,
} = process.env;

test.describe.skip('Backup storage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/storage-locations');
    await page.getByTestId('add-backup-storage').waitFor();
  });

  test('Backup storage creation', async ({ page }) => {
    await page.getByTestId('add-backup-storage').click();
    await page.getByTestId('text-input-name').fill('test-storage-name');
    await page.getByTestId('text-input-description').fill('test-description');

    const namespaces = page.getByTestId('text-input-allowed-namespaces');
    await namespaces.click();
    await page.getByRole('option', { name: 'Select All' }).click();
    await expect(page.getByTestId('select-input-type')).toHaveValue('s3');
    await page
      .getByTestId('text-input-bucket-name')
      .fill(EVEREST_LOCATION_BUCKET_NAME);
    await page.getByTestId('text-input-region').fill(EVEREST_LOCATION_REGION);
    await page.getByTestId('text-input-url').fill(EVEREST_LOCATION_URL);
    await page
      .getByTestId('text-input-access-key')
      .fill(EVEREST_LOCATION_ACCESS_KEY);
    await page
      .getByTestId('text-input-secret-key')
      .fill(EVEREST_LOCATION_SECRET_KEY);
    await page.getByTestId('checkbox-verify-tls').setChecked(false);
    await page.getByTestId('checkbox-force-path-style').setChecked(true);
    await page.getByTestId('form-dialog-add').click();

    await findRowAndClickActions(page, 'test-storage-name', 'Delete');
    await page.getByTestId('confirm-dialog-delete').click();
  });
});
