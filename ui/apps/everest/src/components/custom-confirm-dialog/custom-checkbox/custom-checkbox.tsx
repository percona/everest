import { FormControlLabel } from '@mui/material';
import { CheckboxInput } from '@percona/ui-lib';
import { CustomCheckboxProps } from './custom-checkbox.types';

export const CustomCheckbox = ({
  formControlLabelProps,
  checkboxMessage,
  disabled = false,
}: CustomCheckboxProps) => (
  <FormControlLabel
    {...formControlLabelProps}
    label={checkboxMessage}
    control={<CheckboxInput disabled={disabled} name="dataCheckbox" />}
  />
);

export default CustomCheckbox;
