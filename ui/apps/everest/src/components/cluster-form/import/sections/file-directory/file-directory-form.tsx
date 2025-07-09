import { TextInput } from '@percona/ui-lib';
import { ImportFields } from '../../import.types';
import { Messages } from '../../messages';

export const FileDirectoryForm = () => {
  return (
    <>
      <TextInput
        name={ImportFields.filePath}
        label={Messages.fileDir.label}
        textFieldProps={{
          placeholder: Messages.fileDir.filePathPlaceholder,
        }}
        isRequired
      />
    </>
  );
};
