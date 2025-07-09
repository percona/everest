import { S3DetailsForm } from './s3-details-form';
import SectionFormWithStatus from '../section-with-status';
import { SectionKeys } from '../constants';
import { Messages } from '../../messages';
import { s3Schema } from '../../import-schema';

export const S3DetailsSection = () => {
  return (
    <SectionFormWithStatus
      sectionSavedKey={SectionKeys.s3Details}
      dialogTitle={Messages.s3Details.dialogTitle}
      schema={s3Schema}
    >
      <S3DetailsForm />
    </SectionFormWithStatus>
  );
};
