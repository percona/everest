import { DbWizardType, getDBWizardSchema } from './database-form-schema.ts';
import { DbClusterName, DbWizardMode } from './database-form.types.ts';

export const useDbValidationSchema = (
  activeStep: number,
  defaultValues: DbWizardType,
  mode: DbWizardMode,
  dbClusters: DbClusterName[]
) => {
  // This hook was left to leave an ability of validation depending on mode or other params
  return getDBWizardSchema(activeStep, defaultValues, mode, dbClusters);
};
