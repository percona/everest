import { chromium } from '@playwright/test';
import {
  CI_USER_STORAGE_STATE_FILE,
  SESSION_USER_STORAGE_STATE_FILE,
} from '../constants';

const getTokenFromStorageFile = async (storageFile: string) => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: storageFile,
  });
  const origins = (await context.storageState()).origins;
  await context.close();
  await browser.close();

  return origins[0].localStorage.find((item) => item.name === 'everestToken')
    ?.value;
};

export const getTokenFromLocalStorage = async () => {
  return await getTokenFromStorageFile(CI_USER_STORAGE_STATE_FILE);
};

export const getSessionTokenFromLocalStorage = async () => {
  return await getTokenFromStorageFile(SESSION_USER_STORAGE_STATE_FILE);
};
