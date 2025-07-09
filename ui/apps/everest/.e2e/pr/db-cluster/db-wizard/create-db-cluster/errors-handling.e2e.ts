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
import { goToStep, moveForward } from '@e2e/utils/db-wizard';
import { selectDbEngine } from '../db-wizard-utils';

test.describe('DB Cluster creation', () => {
  test('Wizard form errors', async ({ page }) => {
    await page.goto('/databases');
    await selectDbEngine(page, 'pxc');

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

    // Introduce an error on resources step
    await page.getByTestId('text-input-memory').fill('');
    await expect(page.getByTestId('preview-error-resources')).not.toBeVisible();

    await expect(
      page.getByTestId('db-wizard-cancel-button')
    ).not.toBeDisabled();

    // Backups step
    await moveForward(page);
    // Advanced Configurations step
    await moveForward(page);

    await page
      .getByLabel('switch-input-external-access')
      .getByRole('checkbox')
      .check();
    // Introduce an error on advanced configs step: two invalid IPs
    await page
      .getByTestId('text-input-source-ranges.0.source-range')
      .fill('invalid-ip');
    await expect(
      page.getByTestId('preview-error-advanced-configurations')
    ).not.toBeVisible();

    // Monitoring step
    await moveForward(page);
    await expect(page.getByTestId('db-wizard-submit-button')).toBeDisabled();
    await expect(page.getByTestId('preview-error-resources')).toBeVisible();
    await expect(
      page.getByTestId('preview-error-advanced-configurations')
    ).toBeVisible();
    await goToStep(page, 'resources');
    await page.getByTestId('text-input-memory').fill('1');
    await goToStep(page, 'advanced-configurations');
    await page
      .getByTestId('text-input-source-ranges.0.source-range')
      .fill('192.168.1.1');
    await goToStep(page, 'monitoring');
    await expect(
      page.getByTestId('db-wizard-submit-button')
    ).not.toBeDisabled();
    await expect(page.getByTestId('preview-error-resources')).not.toBeVisible();
    await expect(
      page.getByTestId('preview-error-advanced-configurations')
    ).not.toBeVisible();
  });
});
