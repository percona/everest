import { Divider, MenuItem } from '@mui/material';
import { TextInput, SelectInput } from '@percona/ui-lib';
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

  return (
    <>
      <TextInput
        name={StorageLocationsFields.name}
        label={Messages.name}
        isRequired
        labelProps={{ sx: { mt: 0 } }}
      />
      <TextInput
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
        }}
      />
      <Divider sx={{ mt: 4 }} />
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
      />
      <TextInput
        name={StorageLocationsFields.region}
        label={Messages.region}
        isRequired
      />
      <TextInput
        name={StorageLocationsFields.url}
        label={Messages.url}
        isRequired
      />
      <TextInput
        textFieldProps={{
          placeholder: isEditMode ? '************' : undefined,
        }}
        name={StorageLocationsFields.accessKey}
        label={Messages.accessKey}
        isRequired
      />
      <TextInput
        textFieldProps={{
          placeholder: isEditMode ? '************' : undefined,
        }}
        name={StorageLocationsFields.secretKey}
        label={Messages.secretKey}
        isRequired
      />
    </>
  );
};
