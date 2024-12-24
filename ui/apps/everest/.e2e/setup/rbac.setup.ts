import { saveOldRBACPermissions } from '@e2e/utils/rbac-cmd-line';
import { test as setup } from '@playwright/test';

setup('Save old RBAC permissions', async () => {
  await saveOldRBACPermissions();
});
