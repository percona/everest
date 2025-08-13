import { AffinityType } from 'shared-types/affinity.types';

export const Messages = {
  addRule: 'Add rule',
  editRule: 'Edit rule',
  affinityTypeHelperText: (affinityType: AffinityType) => {
    switch (affinityType) {
      case AffinityType.NodeAffinity:
        return 'A label key assigned to nodes that defines scheduling rules';
      default:
        return 'A label key assigned to pods that defines scheduling rules';
    }
  },
};
