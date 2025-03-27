import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useOnViewportChange,
} from '@xyflow/react';
import { MouseEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import '@xyflow/react/dist/style.css';
import { DBClusterComponent } from 'shared-types/components.types';
import { CustomEdge, CustomNode } from './types';
import ComponentNode from './component-node';
import ContainerNode from './container-node';
import {
  filterOutInvisibleNodesAndEdges,
  getNodesAndEdgesFromDbClusterComponents,
  selectNode,
} from './utils';
import { styled, Button } from '@mui/material';
import { Messages } from './components-diagram-view.messages';

const ReactFlowStyled = styled(ReactFlow<CustomNode, CustomEdge>)(
  ({ theme }) => ({
    '--xy-attribution-background-color': 'transparent',
    '--xy-controls-button-border-color': theme.palette.divider,
    '--xy-controls-button-background-color': theme.palette.background.paper,
  })
);

const ComponentsDiagramView = ({
  components,
}: {
  components: DBClusterComponent[];
}) => {
  const originalNodes = useRef<CustomNode[]>([]);
  const originalEdges = useRef<CustomEdge[]>([]);
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
    (_: MouseEvent, node: CustomNode) => {
      if (node.type === 'containerNode') {
        return;
      }

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

  const handleResetView = useCallback(() => {
    const { nodeComponents: visibleNodes, edgeComponents: visibleEdges } =
      filterOutInvisibleNodesAndEdges(originalNodes.current, originalEdges.current);
    setNodes(visibleNodes);
    setEdges(visibleEdges);
    fitView();
  }, [fitView, setNodes, setEdges]);

  useEffect(() => {
    const { nodeComponents, edgeComponents } =
      getNodesAndEdgesFromDbClusterComponents(components, selectedNode.current);
    originalNodes.current = nodeComponents;
    originalEdges.current = edgeComponents;
    const { nodeComponents: visibleNodes, edgeComponents: visibleEdges } =
      filterOutInvisibleNodesAndEdges(nodeComponents, edgeComponents);
    setNodes(visibleNodes);
    setEdges(visibleEdges);
    fitView();
  }, [components, setEdges, setNodes,fitView]);

  return (
    <>
      <ReactFlowStyled
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onNodesChange={onNodesChange}
        minZoom={0.1}
      >
        <Controls showZoom showFitView={false} showInteractive={false} />
      </ReactFlowStyled>
      <Button
        variant="contained"
        color="primary"
        onClick={handleResetView}
        sx={{ mt: 2 }}
      >
        {Messages.button.resetView}
      </Button>
    </>
  );
};

export default ComponentsDiagramView;
