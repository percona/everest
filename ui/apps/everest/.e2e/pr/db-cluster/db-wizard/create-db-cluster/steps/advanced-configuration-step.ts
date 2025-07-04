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

export const advancedConfigurationStepCheck = async (page: Page) => {
  await expect(
    page.getByRole('heading', { name: 'Advanced Configurations' })
  ).toBeVisible();
  await page
    .getByTestId('switch-input-external-access-label')
    .getByRole('checkbox')
    .check();
  expect(
    await page
      .getByTestId('switch-input-external-access-label')
      .getByRole('checkbox')
      .isChecked()
  ).toBeTruthy();

  const sourceRangeFirstField = page.getByTestId(
    'text-input-source-ranges.0.source-range'
  );
  expect(sourceRangeFirstField).toHaveValue('');

  const addTextInputButton = page.getByTestId('add-text-input-button');
  expect(addTextInputButton.isDisabled());

  await sourceRangeFirstField.fill('192.168.1.1/24');
  await expect(addTextInputButton).toBeEnabled();

  const sourceRangeSecondField = page.getByTestId(
    'text-input-source-ranges.1.source-range'
  );
  await expect(sourceRangeSecondField).toHaveValue('');
  expect(addTextInputButton.isDisabled());

  await sourceRangeSecondField.fill('192.168.1.0');
  await expect(addTextInputButton).toBeEnabled();

  await page
    .getByTestId('switch-input-engine-parameters-enabled-label')
    .getByRole('checkbox')
    .check();

  await page
    .getByTestId('text-input-engine-parameters')
    .fill('max_allowed_packet: 128M');
};
