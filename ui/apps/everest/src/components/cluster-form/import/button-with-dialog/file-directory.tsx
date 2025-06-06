import { Button } from '@mui/material';
import { TextInput } from '@percona/ui-lib';
import { FormDialog } from 'components/form-dialog';
import { useState } from 'react';
import { ImportFields } from '../import.types';
import { Messages } from '../messages';
import { filePathSchema } from '../import-schema';

const FileDirectory = () => {
  const [openDialog, setOpenDialog] = useState(false);
  return (
    <>
      <Button onClick={() => setOpenDialog(true)}>
        {Messages.fillDetails}
      </Button>
      <FormDialog
        isOpen={openDialog}
        closeModal={() => setOpenDialog(false)}
        headerMessage={Messages.fileDir.dialogTitle}
        onSubmit={() => {}}
        schema={filePathSchema}
        submitMessage={Messages.save}
      >
        <TextInput
          name={ImportFields.filePath}
          label={Messages.fileDir.label}
          textFieldProps={{
            placeholder: Messages.fileDir.filePathPlaceholder,
          }}
          isRequired
        />
      </FormDialog>
    </>
  );
};

export default FileDirectory;
