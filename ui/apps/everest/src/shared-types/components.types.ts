import {
  COMPONENT_STATUS,
  CONTAINER_STATUS,
} from '../pages/db-cluster-details/components/components.constants';

export interface Container {
  name: string;
  started: string;
  restarts: number;
  status: CONTAINER_STATUS;
}

export interface DBClusterComponent {
  status: COMPONENT_STATUS;
  name: string;
  type: string;
  started: string;
  restarts: number;
  ready: string;
  containers: Container[];
}

export type DBClusterComponentsList = DBClusterComponent[];
