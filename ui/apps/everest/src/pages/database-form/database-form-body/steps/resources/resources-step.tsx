import { DbType } from '@percona/types';
import { DbWizardFormFields } from '../../../database-form.types.ts';
import { useDatabasePageMode } from '../../../useDatabasePageMode.ts';
import { StepHeader } from '../step-header/step-header.tsx';
import { Messages } from '../../../../../components/db-resources-form/db-resources-form.messages.ts';
import { ResourcesFormFields } from './resources-fields';
import { useFormContext } from 'react-hook-form';

export const ResourcesStep = () => {
  const mode = useDatabasePageMode();
  const { watch } = useFormContext();

  const dbType: DbType = watch(DbWizardFormFields.dbType);

  return (
    <>
      <StepHeader
        pageTitle={Messages.pageTitle}
        pageDescription={Messages.pageDescription}
      />
      <ResourcesFormFields
        dbType={dbType}
        mode={mode === 'restoreFromBackup' ? 'new' : mode}
      />
    </>
  );
};
