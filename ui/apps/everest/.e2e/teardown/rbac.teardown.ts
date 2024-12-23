import { restoreOldRBACPermissions } from '@e2e/utils/rbac-cmd-line';
import { test as setup, expect } from '@playwright/test';

setup('Restore old RBAC permissions', async () => {
  await restoreOldRBACPermissions();
});
