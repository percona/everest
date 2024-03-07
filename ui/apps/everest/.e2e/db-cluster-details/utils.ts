export const clickCreateSchedule = async (page) => {
  const createBackupButton = await page.getByTestId('menu-button');
  createBackupButton.click();
  const scheduleMenuItem = await page.getByTestId('schedule-menu-item');
  await scheduleMenuItem.click();
};

export const clickOnDemandBackup = async (page) => {
  const createBackupButton = await page.getByTestId('menu-button');
  createBackupButton.click();
  const onDemandMenuItem = await page.getByTestId('now-menu-item');
  await onDemandMenuItem.click();
};
