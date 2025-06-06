import { Button } from '@mui/material';
import { TextInput } from '@percona/ui-lib';
import { FormDialog } from 'components/form-dialog';
import { useState } from 'react';
import { ImportFields } from '../import.types';
import { Messages } from '../messages';
import { credentialsSchema } from '../import-schema';

const DbCredentials = () => {
  const [openDialog, setOpenDialog] = useState(false);
  return (
    <>
      <Button onClick={() => setOpenDialog(true)}>
        {Messages.fillDetails}
      </Button>
      <FormDialog
        isOpen={openDialog}
        closeModal={() => setOpenDialog(false)}
        headerMessage={Messages.dbCreds.dialogTitle}
        onSubmit={() => {}}
        schema={credentialsSchema}
        submitMessage={Messages.save}
      >
        <TextInput
          name={ImportFields.root}
          label={Messages.dbCreds.root}
          textFieldProps={{
            placeholder: Messages.enterPassword,
          }}
          isRequired
        />

        <TextInput
          name={ImportFields.proxyadmin}
          label={Messages.dbCreds.proxyAdmin}
          textFieldProps={{
            placeholder: Messages.enterPassword,
          }}
          isRequired
        />

        <TextInput
          name={ImportFields.xtrabackup}
          label={Messages.dbCreds.xtraBackup}
          textFieldProps={{
            placeholder: Messages.enterPassword,
          }}
          isRequired
        />

        <TextInput
          name={ImportFields.monitor}
          label={Messages.dbCreds.monitor}
          textFieldProps={{
            placeholder: Messages.enterPassword,
          }}
          isRequired
        />

        <TextInput
          name={ImportFields.pmmServerPassword}
          label={Messages.dbCreds.pmmServerPassword}
          textFieldProps={{
            placeholder: Messages.enterPassword,
          }}
          isRequired
        />

        <TextInput
          name={ImportFields.operatorAdmin}
          label={Messages.dbCreds.operatorAdmin}
          textFieldProps={{
            placeholder: Messages.enterPassword,
          }}
          isRequired
        />

        <TextInput
          name={ImportFields.replication}
          label={Messages.dbCreds.replication}
          textFieldProps={{
            placeholder: Messages.enterPassword,
          }}
          isRequired
        />
      </FormDialog>
    </>
  );
};

export default DbCredentials;
