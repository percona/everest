import { TextInput } from '@percona/ui-lib';
import { AffinityFormFields } from '../affinity-form.types';

const TopologyKeyInput = () => (
  <TextInput
    name={AffinityFormFields.topologyKey}
    label="Topology Key"
    textFieldProps={{
      sx: {
        flex: '0 0 35%',
      },
      helperText:
        'A label key on nodes that defines the grouping or topology scope (e.g., zone, hostname) where the rules are enforced',
    }}
  />
);

export default TopologyKeyInput;
