import { Page } from '@playwright/test';

export const mockRbacPermissions = async (
  page: Page,
  permissions?: string[][]
) => {
  await page.route('/v1/permissions', async (route) => {
    await route.fulfill({
      json: {
        enabled: permissions !== undefined,
        permissions: permissions || [],
      },
    });
  });
};
