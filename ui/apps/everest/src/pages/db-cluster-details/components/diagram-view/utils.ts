import dagre from 'dagre';
import { Position } from '@xyflow/react';
import { DBClusterComponent } from 'shared-types/components.types';
import { CustomEdge, CustomNode } from './types';
import {
  COMPONENT_NODE_HEIGHT,
  COMPONENT_NODE_WIDTH,
  CONTAINER_NODE_HEIGHT,
  CONTAINER_NODE_WIDTH,
} from './constants';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: CustomNode[], edges: CustomEdge[]) => {
  dagreGraph.setGraph({ rankdir: 'TB' });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: isComponentNode(node)
        ? COMPONENT_NODE_WIDTH
        : CONTAINER_NODE_WIDTH,
      height: isComponentNode(node)
        ? COMPONENT_NODE_HEIGHT
        : CONTAINER_NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes: CustomNode[] = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x:
          nodeWithPosition.x -
          (isComponentNode(node)
            ? COMPONENT_NODE_WIDTH
            : CONTAINER_NODE_WIDTH) /
            2,
        y:
          nodeWithPosition.y -
          (isComponentNode(node)
            ? COMPONENT_NODE_HEIGHT
            : CONTAINER_NODE_HEIGHT) /
            2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

export const getNodesAndEdgesFromDbClusterComponents = (
  components: DBClusterComponent[],
  selectedNode?: string
) => {
  const nodeComponents: CustomNode[] = [];
  const edgeComponents: CustomEdge[] = [];

  components.forEach((clusterComponent, idx) => {
    const { containers, name } = clusterComponent;
    const nodeIsSelected = selectedNode ? selectedNode === name : idx === 0;
    const singleChild = containers.length === 1;
    nodeComponents.push({
      id: name,
      type: 'componentNode',
      width: COMPONENT_NODE_WIDTH,
      height: COMPONENT_NODE_HEIGHT,
      position: { x: 100 * idx, y: 0 },
      data: {
        selected: nodeIsSelected,
        visible: true,
        componentData: clusterComponent,
      },
    });

    containers.forEach((container, idx) => {
      nodeComponents.push({
        id: `${name}/${container.name}`,
        type: 'containerNode',
        width: CONTAINER_NODE_WIDTH,
        height: CONTAINER_NODE_HEIGHT,
        // When there's only one child, draw it right below the parent component, to avoid edge curves
        position: {
          x: singleChild
            ? COMPONENT_NODE_WIDTH / 2 - CONTAINER_NODE_WIDTH / 2
            : 100 * idx,
          y: 100,
        },
        data: {
          visible: nodeIsSelected,
          parentId: name,
          componentData: container,
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

  const { nodes, edges } = getLayoutedElements(nodeComponents, edgeComponents);

  return { nodeComponents: nodes, edgeComponents: edges };
};

export const isComponentNode = (
  node: CustomNode
): node is CustomNode<DBClusterComponent> => {
  return node.type === 'componentNode';
};

export const isContainerNode = (
  node: CustomNode
): node is CustomNode<DBClusterComponent> => {
  return node.type === 'containerNode';
};
