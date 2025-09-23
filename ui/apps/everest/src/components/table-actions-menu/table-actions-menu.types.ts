import { ReactNode } from 'react';
import { ButtonProps, MenuProps } from '@mui/material';

export interface TableActionsMenuProps {
  menuItems: ReactNode[];
  buttonProps?: ButtonProps;
  menuProps?: Omit<MenuProps, 'open'> & {
    showMenu?: boolean;
  };
  isVertical?: boolean;
  buttonColor?: string;
}
