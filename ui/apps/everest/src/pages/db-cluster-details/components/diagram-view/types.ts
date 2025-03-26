import { Node, Edge } from '@xyflow/react';
import { Container, DBClusterComponent } from 'shared-types/components.types';

export type CustomNode<T = DBClusterComponent | Container> = Node<
  {
    selected?: boolean;
    visible?: boolean;
    parentId?: string;
    componentData: T;
  },
  'componentNode' | 'containerNode'
>;

export type CustomEdge = Edge<{
  visible?: boolean;
}>;
