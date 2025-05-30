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
      helperText: 'A domain key that determines relative pod placement',
    }}
  />
);

export default TopologyKeyInput;
