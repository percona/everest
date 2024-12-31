import { TextInput } from '@percona/ui-lib';
import { AffinityFormFields } from '../affinity-form.types';

const TopologyKeyInput = () => (
  <TextInput name={AffinityFormFields.topologyKey} label="Topology Key" />
);

export default TopologyKeyInput;
