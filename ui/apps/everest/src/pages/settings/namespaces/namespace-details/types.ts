import { BoxProps } from '@mui/material';

export type UpgradeHeaderProps = {
  status: 'no-upgrade' | 'pending-tasks' | 'upgrade-available';
} & BoxProps;
