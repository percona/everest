import { DbCredentialsForm } from './db-credentials-form';
import SectionFormWithStatus from '../section-with-status';
import { SectionKeys } from '../constants';
import { Messages } from '../../messages';
import { dbCredentialsSchema } from '../../import-schema';

export const DbCredentialsSection = () => {
  return (
    <SectionFormWithStatus
      sectionSavedKey={SectionKeys.dbCreds}
      dialogTitle={Messages.dbCreds.dialogTitle}
      schema={dbCredentialsSchema}
    >
      <DbCredentialsForm />
    </SectionFormWithStatus>
  );
};
