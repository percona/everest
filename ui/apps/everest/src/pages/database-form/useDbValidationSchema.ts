import { WizardMode } from 'shared-types/wizard.types.ts';
import { DbWizardType, getDBWizardSchema } from './database-form-schema.ts';
import { DbClusterName } from './database-form.types.ts';
import { useLocation } from 'react-router-dom';

export const useDbValidationSchema = (
  activeStep: number,
  defaultValues: DbWizardType,
  dbClusters: DbClusterName[],
  mode: WizardMode
) => {
  const location = useLocation();
  const showImportStep = location.state?.showImport;
  // This hook was left to leave an ability of validation depending on mode or other params
  return getDBWizardSchema(
    activeStep,
    defaultValues,
    dbClusters,
    mode,
    showImportStep
  );
};
