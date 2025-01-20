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
    textFieldProps={{
      sx: {
        flex: '0 0 35%',
      },
      helperText:
        'A label key on pods used to determine the targets for applying affinity or anti-affinity rules',
    }}
  />
);
export default KeyInput;
