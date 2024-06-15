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
import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { STORAGE_STATE_FILE } from './constants';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: path.join(__dirname, 'tests-out'),
  outputDir: './test-results',
  testMatch: /.*\.e2e\.(js|ts)x?/,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['github'],
    ['list'],
    ['html', { open: 'never', outputFolder: './playwright-report' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      testDir: '.',
      name: 'auth',
      testMatch: /auth.setup\.ts/,
    },
    {
      testDir: '.',
      name: 'setup',
      testMatch: /global.setup\.ts/,
      teardown: 'teardown',
      use: {
        storageState: STORAGE_STATE_FILE,
      },
      dependencies: ['auth'],
    },
    {
      testDir: '.',
      name: 'teardown',
      use: {
        storageState: STORAGE_STATE_FILE,
      },
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: 'Chrome Stable',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        storageState: STORAGE_STATE_FILE,
      },
      dependencies: ['setup'],
    },
  ],
});
