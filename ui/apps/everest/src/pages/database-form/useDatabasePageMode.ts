import { useLocation } from 'react-router-dom';
import { DbWizardMode } from './database-form.types';

export const useDatabasePageMode = (): DbWizardMode => {
  const { state } = useLocation();
  if (state?.selectedDbCluster) {
    if (state?.backupName) {
      return 'restoreFromBackup';
    }
    return 'edit';
  }
  return 'new';
};
