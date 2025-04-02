import { WizardMode } from 'shared-types/wizard.types.ts';
import { DbWizardType, getDBWizardSchema } from './database-form-schema.ts';

export const useDbValidationSchema = (
  activeStep: number,
  defaultValues: DbWizardType,
  mode: WizardMode
) => {
  // This hook was left to leave an ability of validation depending on mode or other params
  return getDBWizardSchema(activeStep, defaultValues, mode);
};
