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
  useReactFlow,
  useOnViewportChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MouseEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import { DBClusterComponent } from 'shared-types/components.types';

const COMPONENT_NODE_WIDTH = 280;
const CONTAINER_NODE_WIDTH = 200;

type CustomNodeData = Node<{
  selected?: boolean;
  visible?: boolean;
  parentId?: string;
}>;

type CustomEdgeData = Edge<{
  visible?: boolean;
}>;

const selectNode = (
  nodes: CustomNodeData[],
  edges: CustomEdgeData[],
  id: string
) => ({
  nodes: nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      selected: node.id === id,
      visible:
        node.type === 'componentNode' ||
        (node.type === 'containerNode' && node.data?.parentId === id),
    },
  })),
  edges: edges.map((edge) => ({
    ...edge,
    data: { ...edge.data, visible: edge.source === id || edge.target === id },
  })),
});

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

const getNodesAndEdgesFromDbClusterComponents = (
  components: DBClusterComponent[],
  selectedNode?: string
) => {
  const nodeComponents: CustomNodeData[] = [];
  const edgeComponents: CustomEdgeData[] = [];

  components.forEach(({ name, containers }, idx) => {
    const nodeIsSelected = selectedNode ? selectedNode === name : idx === 0;
    const singleChild = containers.length === 1;
    nodeComponents.push({
      id: name,
      type: 'componentNode',
      width: COMPONENT_NODE_WIDTH,
      position: { x: 300 * idx, y: 0 },
      data: { selected: nodeIsSelected, visible: true },
    });

    containers.forEach((container, idx) => {
      nodeComponents.push({
        id: `${name}/${container.name}`,
        type: 'containerNode',
        width: CONTAINER_NODE_WIDTH,
        // When there's only one child, draw it right below the parent component, to avoid edge curves
        position: {
          x: singleChild
            ? COMPONENT_NODE_WIDTH / 2 - CONTAINER_NODE_WIDTH / 2
            : 300 * idx,
          y: 300,
        },
        data: {
          visible: nodeIsSelected,
          parentId: name,
        },
      });

      edgeComponents.push({
        id: `e${name}-${container.name}`,
        source: name,
        target: `${name}/${container.name}`,
        type: 'smoothstep',
        data: {
          visible: nodeIsSelected,
        },
      });
    });
  });

  return { nodeComponents, edgeComponents };
};

const filterOutInvisibleNodesAndEdges = (
  nodeComponents: CustomNodeData[],
  edgeComponents: CustomEdgeData[]
) => ({
  nodeComponents: nodeComponents.filter((node) => node.data.visible),
  edgeComponents: edgeComponents.filter((edge) => edge.data?.visible),
});

const ComponentsDiagramView = ({
  components,
}: {
  components: DBClusterComponent[];
}) => {
  const originalNodes = useRef<CustomNodeData[]>([]);
  const originalEdges = useRef<CustomEdgeData[]>([]);
  const selectedNode = useRef<string>();
  const viewportChanged = useRef(false);
  const { nodeComponents, edgeComponents } = useMemo(
    () => getNodesAndEdgesFromDbClusterComponents(components),
    [components]
  );
  const [nodes, setNodes] = useNodesState(nodeComponents);
  const [edges, setEdges] = useEdgesState(edgeComponents);
  const { fitView } = useReactFlow();
  const nodeTypes = useMemo(
    () => ({ componentNode: ComponentNode, containerNode: ContainerNode }),
    []
  );

  useOnViewportChange({
    onChange: () => {
      viewportChanged.current = true;
    },
  });

  const handleNodeClick = useCallback(
    (_: MouseEvent, node: CustomNodeData) => {
      selectedNode.current = node.id;
      const { nodes: updatedNodes, edges: updatedEdges } = selectNode(
        originalNodes.current,
        originalEdges.current,
        node.id
      );
      const { nodeComponents: visibleNodes, edgeComponents: visibleEdges } =
        filterOutInvisibleNodesAndEdges(updatedNodes, updatedEdges);
      setNodes(visibleNodes);
      setEdges(visibleEdges);
    },
    [setEdges, setNodes]
  );

  const onNodesChange = useCallback(() => {
    if (!viewportChanged.current) {
      fitView();
      viewportChanged.current = false;
    }
  }, [fitView]);

  useEffect(() => {
    const { nodeComponents, edgeComponents } =
      getNodesAndEdgesFromDbClusterComponents(components, selectedNode.current);
    originalNodes.current = nodeComponents;
    originalEdges.current = edgeComponents;
    const { nodeComponents: visibleNodes, edgeComponents: visibleEdges } =
      filterOutInvisibleNodesAndEdges(nodeComponents, edgeComponents);
    setNodes(visibleNodes);
    setEdges(visibleEdges);
  }, [components, setEdges, setNodes]);

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodesChange={onNodesChange}
      >
        <Controls />
      </ReactFlow>
    </>
  );
};

export default ComponentsDiagramView;
