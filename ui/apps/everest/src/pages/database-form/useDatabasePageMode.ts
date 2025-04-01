import { WizardMode } from '@percona/types';
import { useLocation } from 'react-router-dom';

export const useDatabasePageMode = (): WizardMode => {
  const { state } = useLocation();
  if (state?.selectedDbCluster && state?.backupName) {
    return WizardMode.Restore;
  }
  return WizardMode.New;
};
