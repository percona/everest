import { useLocation } from 'react-router-dom';
import { WizardMode } from 'shared-types/wizard.types';

export const useDatabasePageMode = (): WizardMode => {
  const { state } = useLocation();
  if (state?.selectedDbCluster && state?.backupName) {
    return WizardMode.Restore;
  }
  return WizardMode.New;
};
