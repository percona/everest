import { TextInput } from '@percona/ui-lib';
import { AffinityFormFields } from '../affinity-form.types';

const KeyInput = () => <TextInput name={AffinityFormFields.key} label="Key" />;
export default KeyInput;
