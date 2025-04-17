import { TextInput } from '@percona/ui-lib';
import { AffinityFormFields } from '../affinity-form.types';

const WeightInput = () => (
  <TextInput
    name={AffinityFormFields.weight}
    textFieldProps={{
      helperText: '1 - 100',
      type: 'number',
      sx: {
        width: '213px',
        marginTop: '25px',
      },
    }}
    label="Weight"
  />
);

export default WeightInput;
