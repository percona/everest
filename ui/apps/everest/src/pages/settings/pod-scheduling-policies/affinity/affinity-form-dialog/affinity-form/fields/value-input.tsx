import { TextInput } from '@percona/ui-lib';
import { AffinityFormFields } from '../affinity-form.types';

type Props = {
  disabled: boolean;
};

const ValueInput = ({ disabled }: Props) => (
  <TextInput
    name={AffinityFormFields.values}
    label={'Values'}
    textFieldProps={{
      sx: {
        marginTop: '25px',
        width: '645px',
      },
      inputProps: {
        disabled,
      },
      helperText: 'Insert comma seperated values',
    }}
  />
);

export default ValueInput;
