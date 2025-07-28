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
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { STORAGE_STATE_FILE } from './constants';
import 'dotenv/config';

// Convert 'import.meta.url' to the equivalent __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  retries: process.env.CI ? 2 : 0,
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
    baseURL: process.env.EVEREST_URL || 'http://localhost:3000',
    headless: true,
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
      name: 'session-setup',
      testDir: './setup',
      testMatch: /session-setup\.ts$/,
    },
    {
      name: 'session',
      testDir: './session',
      testMatch: 'session-management.e2e.ts',
      dependencies: ['session-setup'],
      use: {
        storageState: path.join(__dirname, 'sessionUser.json'),
      },
    },
    {
      name: 'session-teardown',
      testDir: './teardown',
      testMatch: /session-teardown\.ts$/,
      dependencies: ['session'],
      use: {
        storageState: path.join(__dirname, 'sessionUser.json'),
      },
    },
    {
      name: 'auth',
      testDir: './setup',
      testMatch: /auth.setup\.ts/,
      dependencies: process.env.SKIP_SESSION === 'true' ? [] : ['session-teardown'],
    },
    {
      name: 'setup',
      testDir: './setup',
      testMatch: /global.setup\.ts/,
      teardown: 'teardown',
      use: {
        storageState: STORAGE_STATE_FILE,
      },
      dependencies: ['auth'],
    },
    {
      name: 'teardown',
      testDir: './teardown',
      use: {
        storageState: STORAGE_STATE_FILE,
      },
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: 'rbac-setup',
      testDir: './setup',
      testMatch: /rbac.setup\.ts/,
      use: {
        storageState: STORAGE_STATE_FILE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'rbac',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        storageState: STORAGE_STATE_FILE,
      },
      testDir: './pr/rbac',
      dependencies: ['setup', 'rbac-setup'],
    },
    {
      name: 'rbac-teardown',
      testDir: './teardown',
      testMatch: /rbac\.teardown\.ts/,
      use: {
        storageState: STORAGE_STATE_FILE,
      },
      dependencies: ['rbac'],
    },
    {
      name: 'pr',
      use: {
        storageState: STORAGE_STATE_FILE,
      },
      testDir: 'pr',
      testIgnore: ['pr/rbac/**/*'],
      dependencies: [
        'setup',
        ...(process.env.IGNORE_RBAC_TESTS &&
        process.env.IGNORE_RBAC_TESTS !== 'false'
          ? []
          : ['rbac', 'rbac-teardown']),
      ],
    },
    {
      name: 'release-rbac-setup',
      teardown: 'release-rbac-teardown',
      testDir: './setup',
      testMatch: /rbac.setup\.ts/,
      use: {
        storageState: STORAGE_STATE_FILE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'release-rbac',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        storageState: STORAGE_STATE_FILE,
      },
      testDir: './release/rbac',
      dependencies: ['setup', 'release-rbac-setup'],
    },
    {
      name: 'release-rbac-teardown',
      testDir: './teardown',
      testMatch: /rbac\.teardown\.ts/,
      use: {
        storageState: STORAGE_STATE_FILE,
      },
      // dependencies: ['release-rbac'],
    },
    {
      name: 'release',
      use: {
        storageState: STORAGE_STATE_FILE,
        actionTimeout: 10000,
      },
      testDir: 'release',
      testIgnore: ['release/rbac/*'],
      dependencies: [
        'setup',
        ...(process.env.IGNORE_RBAC_TESTS &&
        process.env.IGNORE_RBAC_TESTS !== 'false'
          ? []
          : ['release-rbac']),
      ],
    },
    {
      name: 'upgrade',
      use: {
        storageState: STORAGE_STATE_FILE,
        video: 'retain-on-failure',
        actionTimeout: 10000,
      },
      testDir: 'upgrade',
      dependencies: ['setup'],
    },
  ],
});
