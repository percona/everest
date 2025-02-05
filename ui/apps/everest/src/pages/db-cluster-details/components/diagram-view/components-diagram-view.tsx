import {
  ReactFlow,
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
  getLayoutedElements,
  getNodesAndEdgesFromDbClusterComponents,
  isComponentNode,
  isContainerNode,
} from './utils';

const selectNode = (nodes: CustomNode[], edges: CustomEdge[], id: string) => ({
  nodes: nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      selected: node.id === id,
      visible:
        isComponentNode(node) ||
        (isContainerNode(node) && node.data?.parentId === id),
    },
  })),
  edges: edges.map((edge) => ({
    ...edge,
    data: { ...edge.data, visible: edge.source === id || edge.target === id },
  })),
});

const filterOutInvisibleNodesAndEdges = (
  nodeComponents: CustomNode[],
  edgeComponents: CustomEdge[]
) => {
  const visibleNodes = nodeComponents.filter((node) => node.data.visible);
  const visibleEdges = edgeComponents.filter((edge) => edge.data?.visible);
  const { nodes, edges } = getLayoutedElements(visibleNodes, visibleEdges);

  return { nodeComponents: nodes, edgeComponents: edges };
};

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
      />
    </>
  );
};

export default ComponentsDiagramView;
