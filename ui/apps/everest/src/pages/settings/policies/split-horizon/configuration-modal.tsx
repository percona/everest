import { FormDialog } from 'components/form-dialog';
import { TextInput, FileInput } from '@percona/ui-lib';
import { z } from 'zod';
import { Box, Stack, Typography } from '@mui/material';
import { fileValidation } from 'utils/common-validation';
import { FILE_NOT_INSTANCE_OF_FILE_ERROR } from 'consts';

const ConfigurationModal = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    domain: string;
    certificate: File | null;
    key: File | null;
    caCert: File | null;
  }) => void;
}) => {
  return (
    <FormDialog
      isOpen={isOpen}
      closeModal={onClose}
      headerMessage="Create configuration"
      onSubmit={onSubmit}
      schema={z.object({
        domain: z.string().min(1),
        certificate: z
          .instanceof(File, { message: FILE_NOT_INSTANCE_OF_FILE_ERROR })
          .superRefine(fileValidation),
        key: z
          .instanceof(File, { message: FILE_NOT_INSTANCE_OF_FILE_ERROR })
          .superRefine(fileValidation),
        caCert: z
          .instanceof(File, { message: FILE_NOT_INSTANCE_OF_FILE_ERROR })
          .superRefine(fileValidation),
      })}
      defaultValues={{
        domain: '',
        certificate: null,
        key: null,
        caCert: null,
      }}
    >
      <Box>
        <Stack>
          <Typography variant="sectionHeading">Domain</Typography>
          <TextInput
            name="domain"
            label="Domain"
            textFieldProps={{
              placeholder: 'Insert domain',
              helperText:
                'This base domain will be used to generate all cluster hostnames.',
              sx: {
                mt: 2,
              },
            }}
            isRequired
          />
        </Stack>
      </Box>
      <Box mt={2}>
        <Stack gap={2}>
          <Typography variant="sectionHeading">Certificate</Typography>
          <FileInput
            name="certificate"
            label="Certificate"
            textFieldProps={{
              placeholder: 'Insert certificate',
            }}
            fileInputProps={{
              accept: '.pem,.crt,.cer,.cert,.p12,.der,.pfx',
            }}
          />
          <FileInput
            name="key"
            label="Key"
            textFieldProps={{
              placeholder: 'Insert key',
            }}
            fileInputProps={{
              accept: '.key',
            }}
          />
          <FileInput
            name="caCert"
            label="Ca cert"
            textFieldProps={{
              placeholder: 'Insert ca cert',
            }}
            fileInputProps={{
              accept: '.pem,.crt,.cer,.cert,.p12,.der,.pfx,.p12,.ca-bundle',
            }}
          />
        </Stack>
      </Box>
    </FormDialog>
  );
};

export default ConfigurationModal;
