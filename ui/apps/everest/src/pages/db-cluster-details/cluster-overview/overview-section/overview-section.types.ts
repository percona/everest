import { LoadableChildrenProps } from '@percona/ui-lib';
import { ButtonProps } from '@mui/material';

export type OverviewSectionProps = {
  title: string;
  dataTestId?: string;
  actionButtonProps?: ButtonProps;
  editable?: boolean;
} & LoadableChildrenProps;
