import { Dispatch, SetStateAction } from 'react';

export interface UpgradeEverestContextProps {
  openReloadDialog: boolean;
  toggleOpenReloadDialog: () => void;
  setOpenReloadDialog: Dispatch<SetStateAction<boolean>>;
  currentVersion: null | string;
}
