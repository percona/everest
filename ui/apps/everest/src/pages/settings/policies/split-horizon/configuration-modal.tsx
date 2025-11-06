import { FormDialog } from 'components/form-dialog';
import { TextInput, FileInput, SelectInput } from '@percona/ui-lib';
import { z } from 'zod';
import { Box, MenuItem, Stack, Typography } from '@mui/material';
import { fileValidation } from 'utils/common-validation';
import { FILE_NOT_INSTANCE_OF_FILE_ERROR } from 'consts';
import { TableRow } from './types';

const ConfigurationModal = ({
  isOpen,
  isSubmitting,
  namespacesAvailable,
  selectedConfig,
  onClose,
  onSubmit,
}: {
  isSubmitting: boolean;
  namespacesAvailable: string[];
  isOpen: boolean;
  selectedConfig?: TableRow;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    namespace: string;
    domain: string;
    certificate: File | null;
    caKey: File | null;
    caCert: File | null;
    secretName: string;
  }) => void;
}) => {
  return (
    <FormDialog
      isOpen={isOpen}
      submitting={isSubmitting}
      closeModal={onClose}
      headerMessage={
        selectedConfig ? 'Edit configuration' : 'Create configuration'
      }
      onSubmit={onSubmit}
      submitMessage={selectedConfig ? 'Save' : 'Create'}
      schema={z
        .object({
          name: z.string().min(1),
          namespace: z.string().min(1),
          domain: z
            .string()
            .min(1)
            .regex(/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/),
          secretName: z.string().min(1),
          caKey: selectedConfig
            ? z
                .union([
                  z
                    .instanceof(File, {
                      message: FILE_NOT_INSTANCE_OF_FILE_ERROR,
                    })
                    .superRefine(fileValidation),
                  z.null(),
                ])
                .optional()
            : z
                .instanceof(File, { message: FILE_NOT_INSTANCE_OF_FILE_ERROR })
                .superRefine(fileValidation),
          caCert: selectedConfig
            ? z
                .union([
                  z
                    .instanceof(File, {
                      message: FILE_NOT_INSTANCE_OF_FILE_ERROR,
                    })
                    .superRefine(fileValidation),
                  z.null(),
                ])
                .optional()
            : z
                .instanceof(File, { message: FILE_NOT_INSTANCE_OF_FILE_ERROR })
                .superRefine(fileValidation),
        })
        .refine(
          (data) => {
            if (!selectedConfig) {
              return true; // No validation needed in create mode
            }
            // In edit mode: if one is provided, both must be provided
            const hasCaKey = data.caKey instanceof File;
            const hasCaCert = data.caCert instanceof File;
            // Both can be null/undefined, or both must be provided

            if (hasCaKey && !hasCaCert) {
              return false;
            }
            if (!hasCaKey && hasCaCert) {
              return false;
            }
            return true;
          },
          {
            message: 'Both CA certificate and CA key must be provided together',
            path: ['caCert'], // Show error on caCert field
          }
        )}
      defaultValues={{
        name: selectedConfig?.name || '',
        namespace: selectedConfig?.namespace || '',
        domain: selectedConfig?.domain || '',
        secretName: selectedConfig?.secretName || '',
        caKey: null,
        caCert: null,
      }}
    >
      <Box>
        <Stack>
          <Typography variant="sectionHeading">Name</Typography>
          <TextInput
            name="name"
            label="Name"
            textFieldProps={{
              placeholder: 'Insert name',
              disabled: !!selectedConfig,
              sx: {
                mb: 2,
                mt: 2,
              },
            }}
          />
          <Typography variant="sectionHeading">Namespace</Typography>
          <SelectInput
            name="namespace"
            label="Namespace"
            formControlProps={{
              sx: {
                mt: 2,
                mb: 2,
              },
              disabled: !!selectedConfig,
            }}
          >
            {namespacesAvailable.map((namespace) => (
              <MenuItem key={namespace} value={namespace}>
                {namespace}
              </MenuItem>
            ))}
          </SelectInput>
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
              disabled: !!selectedConfig?.inUse,
            }}
            isRequired
          />
        </Stack>
      </Box>
      <Box mt={2}>
        <Stack gap={2}>
          <Typography variant="sectionHeading">TLS</Typography>
          <TextInput
            name="secretName"
            label="Secret name"
            textFieldProps={{
              placeholder: 'Insert secret name',
              disabled: !!selectedConfig,
              sx: {
                mt: 0,
              },
            }}
          />
          <FileInput
            name="caCert"
            label="Ca cert"
            textFieldProps={{
              placeholder: 'Insert ca cert',
            }}
            fileInputProps={{
              accept:
                '.pem,.crt,.cer,.cert,.p12,.der,.pfx,.p12,.ca-bundle,.key',
            }}
          />
          <FileInput
            name="caKey"
            label="Ca key"
            textFieldProps={{
              placeholder: 'Insert certificate',
            }}
            fileInputProps={{
              accept: '.pem,.crt,.cer,.cert,.p12,.der,.pfx,.key',
            }}
          />
        </Stack>
      </Box>
    </FormDialog>
  );
};

export default ConfigurationModal;
