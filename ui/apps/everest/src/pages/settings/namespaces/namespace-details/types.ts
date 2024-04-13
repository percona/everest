import { BoxProps } from '@mui/material';
import { DbType } from '@percona/types';

export type UpgradeHeaderProps = {
  status: 'no-upgrade' | 'pending-tasks' | 'upgrade-available';
} & BoxProps;

export type ClusterStatusTableProps = {
  namespace: string;
  dbType: DbType;
};
