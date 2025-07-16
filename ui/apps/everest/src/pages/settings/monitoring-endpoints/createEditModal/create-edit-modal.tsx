import { AutoCompleteInput, TextInput } from '@percona/ui-lib';
import { FormDialog } from 'components/form-dialog';
import TlsAlert from 'components/tls-alert';
import TlsCheckbox from 'components/tls-checkbox';
import { useMemo, useState } from 'react';
import { Messages } from '../monitoring-endpoints.messages';
import { IconButton } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import {
  CreateEditEndpointModalProps,
  EndpointFormFields,
  EndpointFormType,
  endpointDefaultValues,
  getEndpointSchema,
} from './create-edit-modal.types';
import { useNamespacePermissionsForResource } from 'hooks/rbac';

export const CreateEditEndpointModal = ({
  open,
  handleClose,
  isLoading = false,
  handleSubmit,
  selectedEndpoint,
}: CreateEditEndpointModalProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isEditMode = !!selectedEndpoint;

  const { canCreate } = useNamespacePermissionsForResource(
    'monitoring-instances'
  );
  const endpointSchema = getEndpointSchema(isEditMode);

  const defaultValues = useMemo(
    () =>
      selectedEndpoint
        ? { ...endpointDefaultValues, ...selectedEndpoint }
        : endpointDefaultValues,
    [selectedEndpoint]
  );

  const handleSetShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const onSubmit = (data: EndpointFormType) => {
    handleSubmit(isEditMode, data);
  };

  return (
    <FormDialog
      size="XL"
      isOpen={open}
      closeModal={handleClose}
      submitting={isLoading}
      onSubmit={onSubmit}
      defaultValues={defaultValues}
      headerMessage={Messages.addEditDialogHeader(isEditMode)}
      schema={endpointSchema}
      submitMessage={Messages.addEditDialogSubmitButton(isEditMode)}
    >
      {({ watch }) => (
        <>
          <TextInput
            name={EndpointFormFields.name}
            label={Messages.fieldLabels.name}
            isRequired
            textFieldProps={{
              disabled: isEditMode,
              placeholder: Messages.fieldPlaceholders.name,
            }}
          />
          <AutoCompleteInput
            name={EndpointFormFields.namespace}
            label={Messages.fieldLabels.namespace}
            options={canCreate}
            disabled={isEditMode}
            isRequired
            textFieldProps={{
              placeholder: Messages.fieldPlaceholders.namespaces,
            }}
          />
          <TextInput
            name={EndpointFormFields.url}
            label={Messages.fieldLabels.endpoint}
            isRequired
            textFieldProps={{
              placeholder: Messages.fieldPlaceholders.endpoint,
              onBlur: (event) => event.target.value.replace(/\/+$/, ''),
            }}
          />
          <TextInput
            name={EndpointFormFields.user}
            label={Messages.fieldLabels.user}
            isRequired={!isEditMode}
            {...(isEditMode && {
              controllerProps: {
                rules: {
                  deps: [EndpointFormFields.password],
                },
              },
            })}
            textFieldProps={{
              placeholder: Messages.fieldPlaceholders.user,
            }}
          />
          <TextInput
            name={EndpointFormFields.password}
            label={Messages.fieldLabels.password}
            isRequired={!isEditMode}
            textFieldProps={{
              type: showPassword ? 'text' : 'password',
              placeholder: Messages.fieldPlaceholders.password,
            }}
            {...(isEditMode && {
              controllerProps: {
                rules: {
                  deps: [EndpointFormFields.user],
                },
              },
            })}
            endAdornment={
              <IconButton onClick={handleSetShowPassword}>
                {showPassword ? (
                  <VisibilityOutlinedIcon />
                ) : (
                  <VisibilityOffOutlinedIcon />
                )}
              </IconButton>
            }
          />
          <TlsCheckbox formControlLabelProps={{ sx: { mt: 2 } }} />
          {!watch(EndpointFormFields.verifyTLS) && <TlsAlert sx={{ mt: 2 }} />}
        </>
      )}
    </FormDialog>
  );
};
