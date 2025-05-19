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
// import {SOURCE_RANGE_PLACEHOLDER} from "../../../../../constants";

export const advancedConfigurationStepCheck = async (page: Page) => {
  await expect(
    page.getByRole('heading', { name: 'Advanced Configurations' })
  ).toBeVisible();
  // await page.getByLabel('Enable External Access').check();
  // expect(
  //   await page.getByLabel('Enable External Access').isChecked()
  // ).toBeTruthy();
  //
  // const sourceRangeFirstField = page.getByTestId('text-input-source-ranges.0.source-range');
  // expect(sourceRangeFirstField).toHaveValue('');
  // expect(sourceRangeFirstField).toHaveAttribute('placeholder', SOURCE_RANGE_PLACEHOLDER);
  // await sourceRangeFirstField.fill('192.168.1.1/24');
  //
  // await page.getByTestId('add-text-input-button').click();
  //
  // const sourceRangeSecondField = page
  //     .getByTestId('text-input-source-ranges.1.source-range');
  // expect(sourceRangeSecondField).toHaveValue('');
  // expect(sourceRangeSecondField).toHaveAttribute('placeholder', SOURCE_RANGE_PLACEHOLDER);
  // await sourceRangeSecondField.fill('192.168.1.0');

  await page
    .getByTestId('switch-input-engine-parameters-enabled-label')
    .getByRole('checkbox')
    .check();

  await page
    .getByTestId('text-input-engine-parameters')
    .fill('max_allowed_packet: 128M');
};
