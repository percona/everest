import { TextInput } from '@percona/ui-lib';
import { AffinityFormFields } from '../affinity-form.types';

const KeyInput = () => (
  <TextInput
    name={AffinityFormFields.key}
    label="Key"
    // Deps allows RHF to trigger cross-validation on dependent fields
    controllerProps={{
      rules: {
        deps: [AffinityFormFields.operator, AffinityFormFields.values],
      },
    }}
  />
);
export default KeyInput;
