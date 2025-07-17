import { AutoCompleteInput, TextInput } from '@percona/ui-lib';
import { FormDialog } from 'components/form-dialog';
import TlsAlert from 'components/tls-alert';
import TlsCheckbox from 'components/tls-checkbox';
import { useMemo } from 'react';
import { Messages } from '../monitoring-endpoints.messages';
import {
  CreateEditEndpointModalProps,
  EndpointFormFields,
  EndpointFormType,
  endpointDefaultValues,
  getEndpointSchema,
} from './create-edit-modal.types';
import { useNamespacePermissionsForResource } from 'hooks/rbac';
import { HiddenInput } from 'components/hidden-input';

export const CreateEditEndpointModal = ({
  open,
  handleClose,
  isLoading = false,
  handleSubmit,
  selectedEndpoint,
}: CreateEditEndpointModalProps) => {
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
          <HiddenInput
            name="password"
            isRequired={!isEditMode}
            textFieldProps={{
              label: Messages.fieldLabels.password,
              placeholder: Messages.fieldPlaceholders.password,
            }}
          />
          <TlsCheckbox formControlLabelProps={{ sx: { mt: 2 } }} />
          {!watch(EndpointFormFields.verifyTLS) && <TlsAlert sx={{ mt: 2 }} />}
        </>
      )}
    </FormDialog>
  );
};
