import { FormControlLabelProps } from '@mui/material';

export type TlsCheckboxProps = {
  formControlLabelProps?: Omit<FormControlLabelProps, 'label' | 'control'>;
};
