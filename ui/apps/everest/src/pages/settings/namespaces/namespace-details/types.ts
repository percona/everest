import { BoxProps } from '@mui/material';
import { DbEngineType } from '@percona/types';
import {
  DbEngine,
  OperatorUpgradeDb,
  OperatorUpgradePreflightPayload,
} from 'shared-types/dbEngines.types';

export type UpgradeHeaderProps = {
  engine: DbEngine;
  preflightPayload?: OperatorUpgradePreflightPayload;
  targetVersion: string;
  namespace: string;
  onUpgrade: () => void;
} & BoxProps;

export type ClusterStatusTableProps = {
  namespace: string;
  databases: OperatorUpgradeDb[];
  dbEngine: DbEngine;
};

export type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  namespace: string;
  dbType: DbEngineType;
  newVersion: string;
};

export type EngineLowerContentProps = {
  engine: DbEngine;
  preflightPayload?: OperatorUpgradePreflightPayload;
};
