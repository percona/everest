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
import { expect } from '@playwright/test';

export const backupsStepCheck = async (page) => {
  await expect(
    page.getByText(
      'Specify how often you want to run backup jobs for your database.'
    )
  ).toBeVisible();

  const scheduleNameField = await page.getByTestId('text-input-schedule-name');
  const storageLocationField = await page.getByTestId(
    'text-input-storage-location'
  );

  expect(scheduleNameField).not.toBeEmpty();

  expect(storageLocationField).not.toBeEmpty();
  await storageLocationField.click();

  const storageOptions = page.getByRole('option');
  // TODO should be checked using github pipelines when all the tests will work
  // expect(storageOptions.filter({ hasText: 'ui-dev' })).toBeVisible();
  await storageOptions.first().click();

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
};
