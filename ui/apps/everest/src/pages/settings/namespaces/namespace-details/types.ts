import { BoxProps } from '@mui/material';
import { DbType } from '@percona/types';
import {
  DbEngine,
  OperatorUpgradeDb,
  OperatorUpgradePreflightPayload,
} from 'shared-types/dbEngines.types';

export type UpgradeHeaderProps = {
  // upgradeAvailable: boolean;
  // pendingTasks: boolean;
  // upgrading: boolean;
  // dbType: DbType;
  engine: DbEngine;
  preflightPayload?: OperatorUpgradePreflightPayload;
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

export type EngineLowerContentProps = {
  engine: DbEngine;
  preflightPayload?: OperatorUpgradePreflightPayload;
};
