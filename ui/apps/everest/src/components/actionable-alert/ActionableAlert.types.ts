import { AlertProps, ButtonProps } from '@mui/material';

export type ActionableAlertProps = {
  message: string;
  onClick?: () => void;
  buttonProps?: ButtonProps;
  buttonMessage?: string;
} & AlertProps;
