import { Handle, NodeProps, Position } from '@xyflow/react';
import { CustomNode } from './types';
import { DBClusterComponent } from 'shared-types/components.types';
import { capitalize, Chip, Paper, Stack, Typography } from '@mui/material';
import { COMPONENT_NODE_HEIGHT, COMPONENT_NODE_WIDTH } from './constants';
import StatusField from 'components/status-field';
import { formatDistanceToNowStrict } from 'date-fns';
import { componentStatusToBaseStatus } from '../components.constants';

const ComponentNode = ({
  data: {
    selected,
    componentData: { name, status, ready, type, restarts, started },
  },
}: NodeProps<CustomNode<DBClusterComponent>>) => {
  return (
    <Paper elevation={selected ? 4 : 0}>
      <Stack
        sx={{
          border: '1px solid',
          borderRadius: '4px',
          borderColor: 'divider',
          p: 2,
          height: `${COMPONENT_NODE_HEIGHT}px`,
          width: `${COMPONENT_NODE_WIDTH}px`,
        }}
      >
        <Stack direction={'row'} alignItems={'center'}>
          <StatusField
            status={status}
            statusMap={componentStatusToBaseStatus(ready)}
          >
            <b>{capitalize(status)}</b>
          </StatusField>
          <Typography ml={'auto'} variant="body1">
            {ready} Ready
          </Typography>
        </Stack>
        <Stack mt={2}>
          <Typography variant="body1">{name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDistanceToNowStrict(new Date(started))} | {restarts} restarts
          </Typography>
        </Stack>
        <Chip label={type} sx={{ alignSelf: 'flex-start', mt: 1 }} />
      </Stack>
      <Handle style={{ opacity: 0 }} type="source" position={Position.Bottom} />
    </Paper>
  );
};

export default ComponentNode;
