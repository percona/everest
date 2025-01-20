import { createContext } from 'react';
import { UpgradeEverestContextProps } from './upgrade-everest.context.types';

const UpgradeEverestContext = createContext<UpgradeEverestContextProps>({
  openReloadDialog: false,
  toggleOpenReloadDialog: () => {},
  setOpenReloadDialog: () => {},
  currentVersion: null,
});

export default UpgradeEverestContext;
