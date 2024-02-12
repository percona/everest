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

import { expect, Page } from '@playwright/test';

export const checkDbWizardEditSubmitIsAvailableAndClick = async (
  page: Page
) => {
  const submitFormButton = page.getByTestId('db-wizard-submit-button');
  await expect(submitFormButton).toHaveText('Edit database');
  await expect(submitFormButton).not.toBeDisabled();
  await submitFormButton.click();
};

export const checkSuccessOfUpdateAndGoToDbClustersList = async (page: Page) => {
  await expect(page.getByText('Your database is being updated')).toBeVisible();
  const goToDbClustersButton = page.getByTestId('db-wizard-goto-db-clusters');
  await expect(goToDbClustersButton).not.toBeDisabled();
  await goToDbClustersButton.click();
};
