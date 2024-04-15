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
import { Page, expect } from '@playwright/test';
import { STORAGE_NAMES } from '../../../../constants';

export const backupsStepCheck = async (page: Page) => {
  await expect(
    page.getByText(
      'Create a task that takes regular backups of this database, according to the schedule that you specify.'
    )
  ).toBeVisible();

  const enabledBackupsCheckbox = page
    .getByTestId('switch-input-backups-enabled')
    .getByRole('checkbox');
  await expect(enabledBackupsCheckbox).toBeChecked();

  await expect(
    page.getByText('You don’t have any backup schedules yet.')
  ).toBeVisible();
  await page.getByTestId('create-schedule').click();

  await expect(
    page.getByTestId('new-scheduled-backup-form-dialog')
  ).toBeVisible();
  await expect(page.getByTestId('radio-option-logical')).toBeChecked();

  await expect(page.getByTestId('text-input-schedule-name')).not.toBeEmpty();
  const storageLocationField = page.getByTestId('text-input-storage-location');
  await expect(storageLocationField).not.toBeEmpty();
  await storageLocationField.click();

  const storageOptions = page.getByRole('option');
  const testStorage = storageOptions.filter({ hasText: STORAGE_NAMES[1] });
  await testStorage.click();

  const retentionCopiesField = page.getByTestId('text-input-retention-copies');
  await expect(retentionCopiesField).not.toBeEmpty();
  await retentionCopiesField.fill('1');

  await page.getByTestId('select-selected-time-button').click();
  await page.getByTestId('month-option').click();
  await page.getByTestId('select-on-day-button').click();
  await page.getByTestId('10').click();
  await page.getByTestId('select-hour-button').click();
  await page.getByRole('option', { name: '5' }).click();
  await page.getByTestId('select-minute-button').click();
  await page.getByRole('option', { name: '05' }).click();
  await page.getByTestId('select-am-pm-button').click();
  await page.getByRole('option', { name: 'PM' }).click();

  await page.getByTestId('form-dialog-create').click();

  await expect(
    page.getByTestId('editable-item').getByText('Monthly on day 10 at 5:05 PM')
  ).toBeVisible();
  await expect(page.getByText(STORAGE_NAMES[1])).toBeVisible();
};
