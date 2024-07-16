import { Box, Button, Typography } from '@mui/material';
import { DbEngineType } from '@percona/types';
import { UpgradeHeaderProps } from './types';
import { DbEngineStatus } from 'shared-types/dbEngines.types';
import { Messages } from './messages';
import { useGetPermissions } from 'utils/useGetPermissions';

const upgradeMessage = (
  dbType: DbEngineType,
  isUpToDate: boolean,
  pendingTasks: boolean,
  hasPostUpgradeTasks: boolean,
  targetVersion: string
) => {
  if (isUpToDate) {
    if (hasPostUpgradeTasks) {
      return 'Complete the upgrade by completing the post-upgrade tasks.';
    }
  } else {
    return `Version ${targetVersion} of the ${dbType} operator is available. ${
      pendingTasks ? 'Start upgrading by performing all the pending tasks.' : ''
    }`;
  }
};

const UpgradeHeader = ({
  onUpgrade,
  engine,
  preflightPayload,
  targetVersion,
  namespace,
}: UpgradeHeaderProps) => {
  const isUpToDate = engine.pendingOperatorUpgrades?.length === 0;

  const { canUpdate } = useGetPermissions({
    resource: 'database-engines',
    namespace: namespace,
  });

  if (engine.status === DbEngineStatus.UPGRADING) {
    return (
      <Typography variant="body1">{Messages.upgradingOperator}</Typography>
    );
  }

  if (isUpToDate && !preflightPayload?.databases?.length) {
    return null;
  }

  const pendingTasks = !!(preflightPayload?.databases || []).filter(
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
          hasPostUpgradeTasks,
          targetVersion
        )}
      </Typography>
      {!isUpToDate && canUpdate && (
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
