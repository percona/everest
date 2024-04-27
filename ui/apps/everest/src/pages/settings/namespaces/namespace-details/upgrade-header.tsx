import { Box, Button, Typography } from '@mui/material';
import { UpgradeHeaderProps } from './types';
import { DbType } from '@percona/types';
import { beautifyDbTypeName } from '@percona/utils';

const upgradeMessage = (pendingTasks: boolean, dbType: DbType) => {
  return `A new version of the ${beautifyDbTypeName(
    dbType
  )} Operator is available. ${
    pendingTasks ? 'Start upgrading by performing all the pending tasks' : ''
  }`;
};

const UpgradeHeader = ({
  upgradeAvailable,
  pendingTasks,
  onUpgrade,
  dbType,
}: UpgradeHeaderProps) => {
  if (!upgradeAvailable) {
    return null;
  }

  return (
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Typography variant="body1">
        {upgradeMessage(pendingTasks, dbType)}
      </Typography>
      <Button size="medium" variant="contained" onClick={onUpgrade}>
        Upgrade Operator
      </Button>
    </Box>
  );
};

export default UpgradeHeader;
