import { useMemo } from 'react';
import { CheckboxInput, TextInput } from '@percona/ui-lib';
import { FormControlLabel } from '@mui/material';
import { FormDialog } from 'components/form-dialog';
import {
  CreateEditEndpointModalProps,
  EndpointFormFields,
  EndpointFormType,
  endpointDefaultValues,
  getEndpointSchema,
} from './create-edit-modal.types';
import { Messages } from '../monitoring-endpoints.messages';
import { AutoCompleteSelectAll } from '../../../../components/auto-complete-select-all/auto-complete-select-all';
import { useNamespaces } from '../../../../hooks/api/namespaces/useNamespaces';

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
      <TextInput
        name={EndpointFormFields.name}
        label={Messages.fieldLabels.name}
        isRequired
        textFieldProps={{ disabled: isEditMode }}
      />
      <AutoCompleteSelectAll
        name={EndpointFormFields.namespaces}
        label={Messages.fieldLabels.namespaces}
        loading={isNamespacesFetching}
        options={namespaces}
        isRequired
        textFieldProps={{
          helperText: Messages.helperText.namespaces,
        }}
      />
      <TextInput
        name={EndpointFormFields.url}
        label={Messages.fieldLabels.endpoint}
        isRequired
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
      />
      <TextInput
        name={EndpointFormFields.password}
        label={Messages.fieldLabels.password}
        isRequired={!isEditMode}
        textFieldProps={{ type: 'password' }}
        {...(isEditMode && {
          controllerProps: {
            rules: {
              deps: [EndpointFormFields.user],
            },
          },
        })}
      />
      <FormControlLabel
        sx={{ mt: 2 }}
        label={Messages.fieldLabels.verifyTLS}
        control={<CheckboxInput name={EndpointFormFields.verifyTLS} />}
      />
    </FormDialog>
  );
};
