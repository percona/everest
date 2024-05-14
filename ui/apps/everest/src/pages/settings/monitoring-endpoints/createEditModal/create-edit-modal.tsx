import { TextInput } from '@percona/ui-lib';
import { AutoCompleteSelectAll } from 'components/auto-complete-select-all/auto-complete-select-all';
import { FormDialog } from 'components/form-dialog';
import TlsAlert from 'components/tls-alert';
import TlsCheckbox from 'components/tls-checkbox';
import { useNamespaces } from 'hooks/api/namespaces/useNamespaces';
import { useMemo } from 'react';
import { Messages } from '../monitoring-endpoints.messages';
import {
  CreateEditEndpointModalProps,
  EndpointFormFields,
  EndpointFormType,
  endpointDefaultValues,
  getEndpointSchema,
} from './create-edit-modal.types';

export const CreateEditEndpointModal = ({
  open,
  handleClose,
  isLoading = false,
  handleSubmit,
  selectedEndpoint,
}: CreateEditEndpointModalProps) => {
  const isEditMode = !!selectedEndpoint;
  const { data: namespaces = [], isFetching: isNamespacesFetching } =
    useNamespaces();

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
          <AutoCompleteSelectAll
            name={EndpointFormFields.namespaces}
            label={Messages.fieldLabels.namespaces}
            loading={isNamespacesFetching}
            options={namespaces}
            isRequired
            textFieldProps={{
              helperText: Messages.helperText.namespaces,
              placeholder: Messages.fieldPlaceholders.namespaces,
            }}
          />
          <TextInput
            name={EndpointFormFields.url}
            label={Messages.fieldLabels.endpoint}
            isRequired
            textFieldProps={{
              placeholder: Messages.fieldPlaceholders.endpoint,
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
              type: 'password',
              placeholder: Messages.fieldPlaceholders.password,
            }}
            {...(isEditMode && {
              controllerProps: {
                rules: {
                  deps: [EndpointFormFields.user],
                },
              },
            })}
          />
          <TlsCheckbox formControlLabelProps={{ sx: { mt: 2 } }} />
          {!watch(EndpointFormFields.verifyTLS) && <TlsAlert sx={{ mt: 2 }} />}
        </>
      )}
    </FormDialog>
  );
};
