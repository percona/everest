import { execSync } from 'child_process';
import { switchUser } from '@e2e/utils/user';
import { test as setup } from '@playwright/test';

setup('RBAC setup', async ({ page }) => {
  execSync(
    `kubectl patch configmap/everest-rbac --namespace everest-system --type merge -p '{"data":{"enabled": "true", "policy.csv":"g,${process.env.RBAC_USER},role:admin"}}'`
  );
  await switchUser(page, process.env.RBAC_USER, process.env.RBAC_PASSWORD);
});
