import { Chip } from '@mui/material';
import { EngineChipProps } from './types';

const EngineChip = ({ preflightPayload }: EngineChipProps) => {
  if (!preflightPayload) {
    return null;
  }

  const totalTasks = preflightPayload.databases.length || 0;
  const pendingTasks =
    preflightPayload.databases.filter((db) => db.pendingTask !== 'ready')
      .length || 0;

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
};

export default EngineChip;
