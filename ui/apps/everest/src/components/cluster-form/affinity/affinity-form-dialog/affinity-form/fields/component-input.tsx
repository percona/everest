import { SelectInput } from '@percona/ui-lib';
import { MenuItem } from '@mui/material';
import { AffinityFormFields } from '../affinity-form.types';
import {
  AffinityComponent,
  AffinityComponentValue,
} from 'shared-types/affinity.types';

type Props = {
  disabled: boolean;
  components: AffinityComponent[];
};

const ComponentInput = ({ disabled, components }: Props) => (
  <SelectInput
    name={AffinityFormFields.component}
    label="Component"
    selectFieldProps={{
      label: 'Component',
      sx: { width: '213px' },
      disabled,
    }}
    data-testid="component-select"
  >
    {components.map((value) => (
      <MenuItem key={value} value={value} data-testid={value}>
        {AffinityComponentValue[value]}
      </MenuItem>
    ))}
  </SelectInput>
);

export default ComponentInput;
