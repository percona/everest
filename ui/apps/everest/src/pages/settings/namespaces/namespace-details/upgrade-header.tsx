import { Box, Button, Typography } from '@mui/material';
import { DbEngineType } from '@percona/types';
import { UpgradeHeaderProps } from './types';
import { DbEngineStatus } from 'shared-types/dbEngines.types';
import { Messages } from './messages';

const upgradeMessage = (
  dbType: DbEngineType,
  isUpToDate: boolean,
  pendingTasks: boolean,
  hasPostUpgradeTasks: boolean
) => {
  if (isUpToDate) {
    if (hasPostUpgradeTasks) {
      return 'Complete the upgrade by completing the post-upgrade tasks.';
    }
  } else {
    return `A new version of the ${dbType} operator is available. ${
      pendingTasks ? 'Start upgrading by performing all the pending tasks.' : ''
    }`;
  }
};

const UpgradeHeader = ({
  onUpgrade,
  engine,
  preflightPayload,
}: UpgradeHeaderProps) => {
  if (engine.status === DbEngineStatus.UPGRADING) {
    return (
      <Typography variant="body1">{Messages.upgradingOperator}</Typography>
    );
  }

  if (!preflightPayload?.databases?.length) {
    return null;
  }

  const isUpToDate = engine.pendingOperatorUpgrades?.length === 0;

  const pendingTasks = !!preflightPayload.databases.filter(
    (db) => db.pendingTask && db.pendingTask !== 'ready'
  ).length;

  // If there are no pending operator upgrades but there are "databases", this means post-upgrade tasks
  const hasPostUpgradeTasks = isUpToDate && pendingTasks;

  return (
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Typography variant="body1">
        {upgradeMessage(
          engine.type,
          isUpToDate,
          pendingTasks,
          hasPostUpgradeTasks
        )}
      </Typography>
      {!isUpToDate && (
        <Button
          size="medium"
          variant="contained"
          onClick={onUpgrade}
          disabled={pendingTasks}
        >
          {Messages.upgradeOperator}
        </Button>
      )}
    </Box>
  );
};

export default UpgradeHeader;
