import { FileDirectoryForm } from './file-directory-form';
import SectionFormWithStatus from '../section-with-status';
import { SectionKeys } from '../constants';
import { filePathSchema } from '../../import-schema';
import { Messages } from '../../messages';

export const FileDirectorySection = () => {
  return (
    <SectionFormWithStatus
      sectionSavedKey={SectionKeys.fileDir}
      dialogTitle={Messages.fileDir.dialogTitle}
      schema={filePathSchema}
    >
      <FileDirectoryForm />
    </SectionFormWithStatus>
  );
};
