import { Chip, Stack, Typography } from '@mui/material';
import { SuccessIcon } from '@percona/ui-lib';
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';

const initialNodes = [
  {
    id: '1',
    type: 'componentNode',
    position: { x: 0, y: 0 },
    data: { label: '1' },
  },
  {
    id: '2',
    type: 'componentNode',
    position: { x: 300, y: 0 },
    data: { label: '2' },
  },
  {
    id: '3',
    type: 'componentNode',
    position: { x: 600, y: 0 },
    data: { label: '3' },
  },
  {
    id: '4',
    type: 'containerNode',
    position: { x: 0, y: 300 },
    data: { label: '4' },
  },
  {
    id: '5',
    type: 'containerNode',
    position: { x: 300, y: 300 },
    data: { label: '5' },
  },
  {
    id: '6',
    type: 'containerNode',
    position: { x: 600, y: 300 },
    data: { label: '6' },
  },
  {
    id: '7',
    type: 'containerNode',
    position: { x: 900, y: 300 },
    data: { label: '7' },
  },
];
const initialEdges: Edge[] = [
  { id: 'e2-4', source: '2', target: '4', type: 'smoothstep' },
  { id: 'e2-5', source: '2', target: '5', type: 'smoothstep' },
  { id: 'e2-6', source: '2', target: '6', type: 'smoothstep' },
  { id: 'e2-7', source: '2', target: '7', type: 'smoothstep' },
];

const ComponentNode = ({ data }) => {
  return (
    <>
      <Stack
        sx={{
          border: '1px solid',
          borderRadius: '4px',
          borderColor: 'divider',
          p: 2,
        }}
      >
        <Stack direction={'row'}>
          <SuccessIcon />
          <Typography variant="body2" ml={1}>
            <b>Running</b>
          </Typography>
          <Typography ml={'auto'} variant="body1">
            3/3 Ready
          </Typography>
        </Stack>
        <Stack mt={2}>
          <Typography variant="body1">
            postgresql-d2q-instance-bxwn-0
          </Typography>
          <Typography variant="body2" color="text.secondary">
            12 min | 3 restarts
          </Typography>
        </Stack>
        <Chip label="DB Node" sx={{ alignSelf: 'flex-start', mt: 1 }} />
      </Stack>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
};

const ContainerNode = () => (
  <>
    <Handle type="target" position={Position.Top} />
    <Stack
      sx={{
        border: '1px solid',
        borderRadius: '4px',
        borderColor: 'divider',
        p: 2,
        minWidth: '200px',
      }}
    >
      <Stack direction={'row'}>
        <SuccessIcon />
        <Typography variant="body2" ml={1}>
          <b>Running</b>
        </Typography>
        <Typography ml={'auto'} variant="body1">
          3/3 Ready
        </Typography>
      </Stack>
      <Typography variant="body1"> </Typography>
    </Stack>
  </>
);

const ComponentsDiagramView = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodeTypes = useMemo(
    () => ({ componentNode: ComponentNode, containerNode: ContainerNode }),
    []
  );

  return (
    <>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Controls />
      </ReactFlow>
    </>
  );
};

export default ComponentsDiagramView;
