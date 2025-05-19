import { TextInput } from '@percona/ui-lib';
import { AffinityFormFields } from '../affinity-form.types';
import { AffinityType } from 'shared-types/affinity.types';
import { Messages } from '../../affinity-form-dialog.messages';

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
      helperText: Messages.affinityTypeHelperText(affinityType),
    }}
  />
);
export default KeyInput;
