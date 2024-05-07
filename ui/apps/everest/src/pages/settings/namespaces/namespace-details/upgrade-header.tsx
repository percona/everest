import { Box, Button, Typography } from '@mui/material';
import { DbEngineType } from '@percona/types';
import { UpgradeHeaderProps } from './types';
import { DbEngineStatus } from 'shared-types/dbEngines.types';

const upgradeMessage = (pendingTasks: boolean, dbType: DbEngineType) => {
  return `A new version of the ${dbType} operator is available. ${
    pendingTasks ? 'Start upgrading by performing all the pending tasks.' : ''
  }`;
};

const UpgradeHeader = ({
  onUpgrade,
  engine,
  preflightPayload,
}: UpgradeHeaderProps) => {
  if (engine.status === DbEngineStatus.UPGRADING) {
    return <Typography variant="body1">Upgrading the operator...</Typography>;
  }

  if (!preflightPayload?.databases) {
    return null;
  }

  const pendingTasks = !!preflightPayload.databases.filter(
    (db) => db.pendingTask !== 'ready'
  ).length;

  return (
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Typography variant="body1">
        {upgradeMessage(pendingTasks, engine.type)}
      </Typography>
      <Button
        size="medium"
        variant="contained"
        onClick={onUpgrade}
        disabled={pendingTasks}
      >
        Upgrade Operator
      </Button>
    </Box>
  );
};

export default UpgradeHeader;
