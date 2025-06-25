import { chromium } from '@playwright/test';
import { STORAGE_STATE_FILE } from '../constants';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const getTokenFromLocalStorage = async () => {
  const browser = await chromium.launch();
  const storageStateContext = await browser.newContext({
    storageState: STORAGE_STATE_FILE,
  });
  const origins = (await storageStateContext.storageState()).origins;
  storageStateContext.close();
  return origins[0].localStorage.find((item) => item.name === 'everestToken')
    .value;
};

export const getSessionToken = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: path.join(__dirname, '..', 'sessionUser.json'),
  });
  const origins = (await context.storageState()).origins;
  await context.close();

  return origins[0].localStorage.find(
    (item) => item.name === 'everestToken'
  )?.value;
};