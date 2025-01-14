import { Chip, Paper, Stack, Typography } from '@mui/material';
import { SuccessIcon } from '@percona/ui-lib';
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Edge,
  Node,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MouseEvent, useCallback, useMemo, useState } from 'react';

type CustomNodeData = Node<{
  selected: boolean;
}>;

const initialNodes: CustomNodeData[] = [
  {
    id: '1',
    type: 'componentNode',
    position: { x: 0, y: 0 },
    data: { selected: false },
  },
  {
    id: '2',
    type: 'componentNode',
    position: { x: 300, y: 0 },
    data: { selected: false },
  },
  {
    id: '3',
    type: 'componentNode',
    position: { x: 600, y: 0 },
    data: { selected: false },
  },
  {
    id: '4',
    type: 'containerNode',
    position: { x: 0, y: 300 },
    data: { selected: false },
  },
  {
    id: '5',
    type: 'containerNode',
    position: { x: 300, y: 300 },
    data: { selected: false },
  },
  {
    id: '6',
    type: 'containerNode',
    position: { x: 600, y: 300 },
    data: { selected: false },
  },
  {
    id: '7',
    type: 'containerNode',
    position: { x: 900, y: 300 },
    data: { selected: false },
  },
];
const initialEdges: Edge[] = [
  { id: 'e2-4', source: '2', target: '4', type: 'smoothstep' },
  { id: 'e2-5', source: '2', target: '5', type: 'smoothstep' },
  { id: 'e2-6', source: '2', target: '6', type: 'smoothstep' },
  { id: 'e2-7', source: '2', target: '7', type: 'smoothstep' },
];

const selectNode = (nodes: CustomNodeData[], id: string) => {
  return nodes.map((node) => {
    return {
      ...node,
      data: {
        ...node.data,
        selected: node.id === id,
      },
    };
  });
};

const ComponentNode = ({ data }: NodeProps<CustomNodeData>) => {
  return (
    <Paper elevation={data.selected ? 4 : 0}>
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
    </Paper>
  );
};

const ContainerNode = () => (
  <Paper elevation={0}>
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
  </Paper>
);

const ComponentsDiagramView = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodeTypes = useMemo(
    () => ({ componentNode: ComponentNode, containerNode: ContainerNode }),
    []
  );

  const handleNodeClick = useCallback(
    (event: MouseEvent, node: CustomNodeData) => {
      const newNodes = selectNode(nodes, node.id);
      setNodes(newNodes);
    },
    [nodes, setNodes]
  );

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        onNodeClick={handleNodeClick}
      >
        <Controls />
      </ReactFlow>
    </>
  );
};

export default ComponentsDiagramView;
