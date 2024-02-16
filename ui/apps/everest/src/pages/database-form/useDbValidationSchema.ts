import { DbWizardMode } from './database-form.types';
import { getDBWizardSchema } from './database-form-schema.ts';
import { DbCluster } from 'shared-types/dbCluster.types.ts';

export const useDbValidationSchema = (
  activeStep: number,
  mode: DbWizardMode,
  dbCluster?: DbCluster
) => {
  const schedules = dbCluster?.spec?.backup?.schedules;
  const hideBackupValidation =
    mode === 'edit' && !!schedules && schedules?.length > 1;

  return getDBWizardSchema(activeStep, hideBackupValidation);
};
