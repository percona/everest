import { FormControlLabelProps } from '@mui/material';

export type CustomCheckboxProps = {
  formControlLabelProps?: Omit<FormControlLabelProps, 'label' | 'control'>;
  checkboxMessage: string;
};
