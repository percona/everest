import { EMPTY_LOAD_BALACNER_CONFIGURATION } from 'consts';
import { LoadBalancerConfig } from 'shared-types/loadbalancer.types';

export const SELECT_WIDTH = '200px';

export const emtpyConfig: LoadBalancerConfig = {
  apiVersion: '',
  kind: '',
  metadata: {
    name: EMPTY_LOAD_BALACNER_CONFIGURATION,
  },
  spec: { annotations: {} },
};
