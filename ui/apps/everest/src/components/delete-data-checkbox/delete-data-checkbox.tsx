import { FormControlLabel } from '@mui/material';
import { CheckboxInput } from '@percona/ui-lib';
import { Messages } from './delete-data-checkbox.messages';
import { DeleteDataCheckboxProps } from './delete-data-checkbox.types';

export const DeleteDataCheckbox = ({
  formControlLabelProps,
}: DeleteDataCheckboxProps) => (
  <FormControlLabel
    {...formControlLabelProps}
    label={Messages.deleteData}
    control={<CheckboxInput name="cleanupBackupStorage" />}
  />
);

export default DeleteDataCheckbox;
