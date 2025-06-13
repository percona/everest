import { SelectInput } from '@percona/ui-lib';
import { MenuItem } from '@mui/material';
import { AffinityType, AffinityTypeValue } from 'shared-types/affinity.types';
import { AffinityFormFields } from '../affinity-form.types';

const TypeInput = () => (
  <SelectInput
    name={AffinityFormFields.type}
    label={'Type'}
    selectFieldProps={{ sx: { width: '213px' }, label: 'Type' }}
    data-testid="type-select"
  >
    {Object.values(AffinityType).map((value) => (
      <MenuItem key={value} value={value} data-testid={value}>
        {AffinityTypeValue[value]}
      </MenuItem>
    ))}
  </SelectInput>
);

export default TypeInput;
