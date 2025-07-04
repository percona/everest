import { DbCredentialsForm } from './db-credentials-form';
import SectionFormWithStatus from '../section-with-status';
import { SectionKeys } from '../constants';
import { Messages } from '../../messages';
import { DbCredentialsSectionProps } from '../../import.types';
import { z } from 'zod';

export const DbCredentialsSection = ({
  secretKeys = [],
}: DbCredentialsSectionProps) => {
  const credentialsSchemaObject = secretKeys.reduce(
    (acc, field) => {
      acc[field.name] = z.string().min(1).max(250);
      return acc;
    },
    {} as Record<string, z.ZodTypeAny>
  );

  const schema = z.object({
    credentials: z.object(credentialsSchemaObject),
  });
  return (
    <SectionFormWithStatus
      sectionSavedKey={SectionKeys.dbCreds}
      dialogTitle={Messages.dbCreds.dialogTitle}
      schema={schema}
    >
      <DbCredentialsForm secretKeys={secretKeys} />
    </SectionFormWithStatus>
  );
};
