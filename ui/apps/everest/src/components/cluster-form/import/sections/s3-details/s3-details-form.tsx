import { CheckboxInput, TextInput } from '@percona/ui-lib';
import { ImportFields } from '../../import.types';
import { Messages } from '../../messages';
import { Box, FormControlLabel, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export const S3DetailsForm = () => {
  return (
    <>
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
    </>
  );
};
