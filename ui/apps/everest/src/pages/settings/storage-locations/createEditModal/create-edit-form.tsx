import { useState } from 'react';
import { Divider, FormControlLabel, IconButton, MenuItem } from '@mui/material';
import { TextInput, SelectInput, CheckboxInput } from '@percona/ui-lib';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { StorageType } from 'shared-types/backupStorages.types';
import { Messages } from '../storage-locations.messages';
import { StorageLocationsFields } from '../storage-locations.types';
import { useNamespaces } from '../../../../hooks/api/namespaces/useNamespaces';
import { AutoCompleteSelectAll } from '../../../../components/auto-complete-select-all/auto-complete-select-all';

interface CreateEditFormProps {
  isEditMode: boolean;
}
export const CreateEditStorageForm = ({ isEditMode }: CreateEditFormProps) => {
  const { data: namespaces = [], isFetching: isNamespacesFetching } =
    useNamespaces();

  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);

  return (
    <>
      <TextInput
        textFieldProps={{
          placeholder: Messages.createEditModal.placeholders.name,
        }}
        name={StorageLocationsFields.name}
        label={Messages.name}
        isRequired
        labelProps={{ sx: { mt: 0 } }}
      />
      <TextInput
        textFieldProps={{
          placeholder: Messages.createEditModal.placeholders.description,
        }}
        name={StorageLocationsFields.description}
        label={Messages.description}
      />
      <AutoCompleteSelectAll
        name={StorageLocationsFields.namespaces}
        label={Messages.namespaces}
        loading={isNamespacesFetching}
        options={namespaces}
        isRequired
        textFieldProps={{
          helperText: Messages.createEditModal.helperText.namespaces,
          placeholder: Messages.createEditModal.placeholders.namespaces,
        }}
      />
      <Divider sx={{ mt: 4, mb: 2 }} />
      <SelectInput
        name={StorageLocationsFields.type}
        label={Messages.type}
        selectFieldProps={{ disabled: isEditMode }}
        isRequired
      >
        <MenuItem value={StorageType.S3}>{Messages.s3}</MenuItem>
        {/* <MenuItem value={StorageType.GCS}>{Messages.gcs}</MenuItem> */}
        {/* <MenuItem value={StorageType.AZURE}>{Messages.azure}</MenuItem> */}
      </SelectInput>
      <TextInput
        name={StorageLocationsFields.bucketName}
        label={Messages.bucketName}
        isRequired
        textFieldProps={{
          placeholder: Messages.createEditModal.placeholders.type,
        }}
      />
      <TextInput
        name={StorageLocationsFields.region}
        label={Messages.region}
        isRequired
        textFieldProps={{
          placeholder: Messages.createEditModal.placeholders.region,
        }}
      />
      <TextInput
        name={StorageLocationsFields.url}
        label={Messages.url}
        isRequired
        textFieldProps={{
          placeholder: Messages.createEditModal.placeholders.url,
        }}
      />
      <TextInput
        textFieldProps={{
          type: showAccessKey ? 'text' : 'password',
          placeholder: Messages.createEditModal.placeholders.accessKey,
          InputProps: {
            endAdornment: (
              <IconButton onClick={() => setShowAccessKey(!showAccessKey)}>
                {showAccessKey ? (
                  <VisibilityOutlinedIcon />
                ) : (
                  <VisibilityOffOutlinedIcon />
                )}
              </IconButton>
            ),
          },
        }}
        name={StorageLocationsFields.accessKey}
        label={Messages.accessKey}
        isRequired
      />
      <TextInput
        textFieldProps={{
          type: showSecretKey ? 'text' : 'password',
          placeholder: Messages.createEditModal.placeholders.secretKey,
          InputProps: {
            endAdornment: (
              <IconButton onClick={() => setShowSecretKey(!showSecretKey)}>
                {showSecretKey ? (
                  <VisibilityOutlinedIcon />
                ) : (
                  <VisibilityOffOutlinedIcon />
                )}
              </IconButton>
            ),
          },
        }}
        name={StorageLocationsFields.secretKey}
        label={Messages.secretKey}
        isRequired
      />
      <FormControlLabel
        sx={{ mt: 2 }}
        label={Messages.verifyTLS}
        control={<CheckboxInput name={StorageLocationsFields.verifyTLS} />}
      />
    </>
  );
};
