import { Chip, Typography } from '@mui/material';
import { DbEngineStatus } from 'shared-types/dbEngines.types';
import { EngineLowerContentProps } from './types';

const EngineLowerContent = ({
  engine,
  preflightPayload,
}: EngineLowerContentProps) => {
  if (engine.status === DbEngineStatus.UPGRADING) {
    return <Chip label="Upgrading" color="warning" size="small" />;
  }

  const pendingTasks =
    (preflightPayload?.databases || []).filter(
      (db) => db.pendingTask && db.pendingTask !== 'ready'
    ).length || 0;

  if (engine.pendingOperatorUpgrades?.length) {
    const totalTasks = (preflightPayload?.databases || []).length || 0;

    if (pendingTasks > 0) {
      return (
        <Chip
          label={`${pendingTasks}/${totalTasks} tasks pending`}
          color="warning"
          size="small"
        />
      );
    }

    return <Chip label="Upgrade available" color="warning" size="small" />;
  }

  return (
    <Typography variant="body2">version {engine.operatorVersion}</Typography>
  );
};

export default EngineLowerContent;
