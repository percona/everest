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

import { expect, test } from '@playwright/test';
import { goToStep, moveForward } from '../../../utils/db-wizard';

test.describe('DB Cluster creation', () => {
  test('Blocking the edit buttons when an error occurs in the form', async ({
    page,
  }) => {
    await page.goto('/databases');
    await page.getByTestId('add-db-cluster-button').click();

    // Resources Step
    await moveForward(page);
    // Backups step
    await moveForward(page);

    await goToStep(page, 'resources');

    await expect(
      page.getByTestId('db-wizard-previous-button')
    ).not.toBeDisabled();
    await expect(
      page.getByTestId('db-wizard-continue-button')
    ).not.toBeDisabled();
    await expect(
      page.getByTestId('db-wizard-cancel-button')
    ).not.toBeDisabled();
    await expect(
      page.getByTestId('button-edit-preview-basic-information')
    ).not.toBeDisabled();
    await expect(
      page.getByTestId('button-edit-preview-backups')
    ).not.toBeDisabled();

    await page.getByTestId('text-input-memory').fill('');

    await expect(page.getByTestId('db-wizard-previous-button')).toBeDisabled();
    await expect(page.getByTestId('db-wizard-continue-button')).toBeDisabled();
    await expect(
      page.getByTestId('db-wizard-cancel-button')
    ).not.toBeDisabled();
    await expect(
      page.getByTestId('button-edit-preview-basic-information')
    ).not.toBeVisible();
    await expect(
      page.getByTestId('button-edit-preview-backups')
    ).not.toBeVisible();
  });
});
