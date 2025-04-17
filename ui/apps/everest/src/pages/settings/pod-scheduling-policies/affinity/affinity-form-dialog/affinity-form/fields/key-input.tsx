import { TextInput } from '@percona/ui-lib';
import { AffinityFormFields } from '../affinity-form.types';
import { AffinityType } from 'shared-types/affinity.types';

const getHelperTextForAffinityType = (affinityType: AffinityType) => {
  switch (affinityType) {
    case AffinityType.NodeAffinity:
      return 'A label key assigned to nodes that defines scheduling rules';
    default:
      return 'A label key assigned to pods that defines scheduling rules';
  }
};

const KeyInput = ({ affinityType }: { affinityType: AffinityType }) => (
  <TextInput
    name={AffinityFormFields.key}
    label="Key"
    // Deps allows RHF to trigger cross-validation on dependent fields
    controllerProps={{
      rules: {
        deps: [AffinityFormFields.operator, AffinityFormFields.values],
      },
    }}
    textFieldProps={{
      sx: {
        flex: '0 0 35%',
      },
      helperText: getHelperTextForAffinityType(affinityType),
    }}
  />
);
export default KeyInput;
