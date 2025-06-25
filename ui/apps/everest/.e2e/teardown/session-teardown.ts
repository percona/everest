import { test } from '@playwright/test';
import { execSync } from 'child_process';

const USER = process.env.SESSION_USER!;

test('Teardown session user', async () => {
  if (!USER) {
    throw new Error('SESSION_USER is not set');
  }

  console.log(`Checking if user '${USER}' exists before deleting...`);

  // List users
  const output = execSync(
    `go run ../../../cmd/cli/main.go accounts list`
  ).toString();

  // Check if USER exists
  if (output.includes(USER)) {
    execSync(`go run ../../../cmd/cli/main.go accounts delete -u ${USER}`);
    console.log(`User '${USER}' has been deleted successfully`);
  } else {
    console.log(`User '${USER}' does not exist. Skipping deletion.`);
  }
});
