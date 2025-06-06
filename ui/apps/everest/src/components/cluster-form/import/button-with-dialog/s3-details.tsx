import { Box, Button, FormControlLabel, Tooltip } from '@mui/material';
import { CheckboxInput, TextInput } from '@percona/ui-lib';
import { FormDialog } from 'components/form-dialog';
import { useState } from 'react';
import { ImportFields } from '../import.types';
import { Messages } from '../messages';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { s3Schema } from '../import-schema';

const S3Details = () => {
  const [openDialog, setOpenDialog] = useState(false);
  return (
    <>
      <Button onClick={() => setOpenDialog(true)}>Fill details </Button>
      <FormDialog
        isOpen={openDialog}
        closeModal={() => setOpenDialog(false)}
        headerMessage={Messages.s3Details.dialogTitle}
        onSubmit={() => {}}
        schema={s3Schema}
        submitMessage="Save"
      >
        <TextInput
          name={ImportFields.bucketName}
          label={Messages.s3Details.bucketName}
          textFieldProps={{
            placeholder: Messages.s3Details.bucketNamePlaceholder,
          }}
          isRequired
        />
        <TextInput
          name={ImportFields.region}
          label={Messages.s3Details.region}
          textFieldProps={{
            placeholder: Messages.s3Details.regionPlaceholder,
          }}
          isRequired
        />

        <TextInput
          name={ImportFields.endpoint}
          label={Messages.s3Details.endpoint}
          textFieldProps={{
            placeholder: Messages.s3Details.endpointPlaceHolder,
          }}
          isRequired
        />
        <TextInput
          name={ImportFields.accessKey}
          label={Messages.s3Details.accessKey}
          textFieldProps={{
            placeholder: Messages.s3Details.accessKeyPlaceholder,
          }}
          isRequired
        />
        <TextInput
          name={ImportFields.secretKey}
          label={Messages.s3Details.secretKey}
          textFieldProps={{
            placeholder: Messages.s3Details.secretKeyPlaceholder,
          }}
          isRequired
        />

        <FormControlLabel
          label={
            <Box display="flex" mt={0}>
              {Messages.s3Details.labelCheckbox}
              <Tooltip
                title={'label tooltip'}
                arrow
                placement="right"
                sx={{ ml: 1 }}
              >
                <InfoOutlinedIcon />
              </Tooltip>
            </Box>
          }
          control={<CheckboxInput name={ImportFields.label} />}
        />
      </FormDialog>
    </>
  );
};

export default S3Details;
