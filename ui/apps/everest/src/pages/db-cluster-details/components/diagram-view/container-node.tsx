import { Handle, NodeProps, Position } from '@xyflow/react';
import { CustomNode } from './types';
import { Container } from 'shared-types/components.types';
import { Paper, Stack, Typography } from '@mui/material';
import { CONTAINER_NODE_HEIGHT, CONTAINER_NODE_WIDTH } from './constants';
import { containerStatusToBaseStatus } from '../components.constants';
import ComponentStatus from '../component-status';

const ContainerNode = ({
  data: {
    componentData: { status, ready, name },
  },
}: NodeProps<CustomNode<Container>>) => (
  <Paper elevation={0}>
    <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    <Stack
      sx={{
        border: '1px solid',
        borderRadius: '4px',
        borderColor: 'divider',
        p: 2,
        height: `${CONTAINER_NODE_HEIGHT}px`,
        width: `${CONTAINER_NODE_WIDTH}px`,
      }}
    >
      <Stack direction={'row'} alignItems={'center'}>
        <ComponentStatus
          status={status}
          statusMap={containerStatusToBaseStatus(ready)}
        />
        <Typography ml={'auto'} variant="body1">
          {ready ? 'Ready' : 'Not Ready'}
        </Typography>
      </Stack>
      <Typography variant="body1" mt={2}>
        {name}
      </Typography>
    </Stack>
  </Paper>
);

export default ContainerNode;
