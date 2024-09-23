import { expect, test } from '@playwright/test';
import fs from "fs";
import { everestdir } from "../constants";
import { expectedEverestUpgradeLog } from "./testData";

test.describe('Post upgrade tests', {tag: '@post-upgrade'}, async () => {

  test('Verify upgrade.log file', async ({page}) => {
    const filePath = `${everestdir}/ui/apps/everest/.e2e/upgrade.log`;
    const data = fs.readFileSync(filePath, 'utf8');

    const expectedText = expectedEverestUpgradeLog();
    expect(data).toContain(expectedText);
  });
});
