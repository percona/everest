import { PoliciesType } from './policies.types';

export const policies: PoliciesType[] = [
  {
    name: 'Pod scheduling policies',
    description:
      'Manage database pod scheduling across your Kubernetes cluster with custom policies for optimal placement and resource efficiency.',
    redirectUrl: '/settings/policies/pod-scheduling',
  },
  {
    name: 'Load Balancer Configuration',
    description:
      'Define the annotations added to the Kubernetes Service to control Load Balancer traffic, security, and routing.',
    redirectUrl: '/settings/policies/load-balancer-configuration',
  },
];
