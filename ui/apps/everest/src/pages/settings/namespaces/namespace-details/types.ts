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
  dbType: DbEngineType;
  newVersion: string;
};

export type EngineLowerContentProps = {
  engine: DbEngine;
  preflightPayload?: OperatorUpgradePreflightPayload;
};
