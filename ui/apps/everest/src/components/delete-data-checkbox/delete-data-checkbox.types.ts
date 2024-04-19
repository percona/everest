import { FormControlLabelProps } from '@mui/material';

export type DeleteDataCheckboxProps = {
  formControlLabelProps?: Omit<FormControlLabelProps, 'label' | 'control'>;
};
