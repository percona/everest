import { AlertProps, LinkProps } from '@mui/material';
import { ReactNode } from 'react';

export type LinkedAlertProps = {
  message: string;
  linkProps: LinkProps & {
    linkContent: ReactNode;
  };
} & AlertProps;
