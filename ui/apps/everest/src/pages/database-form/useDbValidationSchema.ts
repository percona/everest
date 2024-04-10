import { getDBWizardSchema } from './database-form-schema.ts';

export const useDbValidationSchema = (activeStep: number) => {
  // This hook was left to leave an ability of validation depending on mode or other params
  return getDBWizardSchema(activeStep);
};
