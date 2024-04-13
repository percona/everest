import { BoxProps } from '@mui/material';
import { DbType } from '@percona/types';

export type UpgradeHeaderProps = {
  status: 'no-upgrade' | 'pending-tasks' | 'upgrade-available';
  onUpgrade: () => void;
} & BoxProps;

export type ClusterStatusTableProps = {
  namespace: string;
};

export type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  namespace: string;
  dbType: DbType;
  newVersion: string;
  supportedVersions: string[];
};
