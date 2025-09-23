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
// See the License for the specific language governing permissions ands
// limitations under the License.

import { test as teardown } from '@playwright/test';
import { execSync } from 'child_process';
import { getCliPath } from '@e2e/utils/session-cli';

const USER = process.env.SESSION_USER!;

const cliPath = getCliPath();

teardown.describe.serial('Session teardown', () => {
  teardown('Delete session user', async () => {
    if (!USER) {
      throw new Error('SESSION_USER is not set');
    }

    console.log(`Checking if user '${USER}' exists before deleting...`);

    // List users
    const output = execSync(`${cliPath} accounts list`).toString();

    // Check if USER exists
    if (output.includes(USER)) {
      execSync(`${cliPath} accounts delete -u ${USER}`);
      console.log(`User '${USER}' has been deleted successfully`);
    } else {
      console.log(`User '${USER}' does not exist. Skipping deletion.`);
    }
  });
});
