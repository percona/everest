import { restoreOldRBACPermissions } from '@e2e/utils/rbac-cmd-line';
import { switchUser } from '@e2e/utils/user';
import { test as setup } from '@playwright/test';

setup('RBAC teardown', async ({ page }) => {
  await restoreOldRBACPermissions();
  await switchUser(page, process.env.CI_USER, process.env.CI_PASSWORD);
});
