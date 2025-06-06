import { Button } from '@mui/material';
import { TextInput } from '@percona/ui-lib';
import { FormDialog } from 'components/form-dialog';
import { useState } from 'react';
import { ImportFields } from '../import.types';
import { Messages } from '../messages';
import { configSchema } from '../import-schema';

const DbConfig = () => {
  const [openDialog, setOpenDialog] = useState(false);
  return (
    <>
      <Button onClick={() => setOpenDialog(true)}>
        {Messages.fillDetails}
      </Button>
      <FormDialog
        isOpen={openDialog}
        closeModal={() => setOpenDialog(false)}
        headerMessage={Messages.config.label}
        onSubmit={() => {}}
        schema={configSchema}
        submitMessage={Messages.save}
      >
        <TextInput
          name={ImportFields.recoveryTarget}
          label={Messages.config.recoveryTarget}
          textFieldProps={{
            placeholder: Messages.enterPassword,
          }}
          isRequired
        />

        <TextInput
          name={ImportFields.recoveryTargetLSN}
          label={Messages.config.recoveryTargetLSN}
          textFieldProps={{
            placeholder: Messages.enterPassword,
          }}
          isRequired
        />

        <TextInput
          name={ImportFields.recoveryTargetXID}
          label={Messages.config.recoveryTargetXID}
          textFieldProps={{
            placeholder: Messages.enterPassword,
          }}
          isRequired
        />

        <TextInput
          name={ImportFields.recoveryTargetTime}
          label={Messages.config.recoveryTargetTime}
          textFieldProps={{
            placeholder: Messages.enterPassword,
          }}
          isRequired
        />

        <TextInput
          name={ImportFields.recoveryTargetName}
          label={Messages.config.recoveryTargetName}
          textFieldProps={{
            placeholder: Messages.enterPassword,
          }}
          isRequired
        />
      </FormDialog>
    </>
  );
};

export default DbConfig;
