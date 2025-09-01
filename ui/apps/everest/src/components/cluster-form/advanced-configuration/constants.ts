import { EMPTY_LOAD_BALACNER_CONFIGURATION } from 'consts';
import { LoadBalancerConfig } from 'shared-types/loadbalancer.types';

export const SELECT_WIDTH = '200px';

export const emtpyConfig: LoadBalancerConfig = {
  metadata: {
    name: EMPTY_LOAD_BALACNER_CONFIGURATION,
    resourceVersion: '',
    finalizers: [],
    generation: 0,
  },
  spec: { annotations: {} },
};
