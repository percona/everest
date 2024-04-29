import { BoxProps } from '@mui/material';
import { DbType } from '@percona/types';
import {
  OperatorUpgradeDb,
  OperatorUpgradePreflightPayload,
} from 'shared-types/dbEngines.types';

export type UpgradeHeaderProps = {
  upgradeAvailable: boolean;
  pendingTasks: boolean;
  upgrading: boolean;
  dbType: DbType;
  onUpgrade: () => void;
} & BoxProps;

export type ClusterStatusTableProps = {
  namespace: string;
  databases: OperatorUpgradeDb[];
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

export type EngineChipProps = {
  preflightPayload?: OperatorUpgradePreflightPayload;
};
