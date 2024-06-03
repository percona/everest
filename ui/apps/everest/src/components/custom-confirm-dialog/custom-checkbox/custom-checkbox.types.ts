import { FormControlLabelProps } from '@mui/material';
import { ReactNode } from 'react';

export type CustomCheckboxProps = {
  formControlLabelProps?: Omit<FormControlLabelProps, 'label' | 'control'>;
  checkboxMessage: ReactNode;
  disabled?: boolean;
};
