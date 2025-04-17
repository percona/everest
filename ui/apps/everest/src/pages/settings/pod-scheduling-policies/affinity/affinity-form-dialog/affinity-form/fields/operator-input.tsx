import {
  AffinityOperator,
  AffinityOperatorValue,
} from 'shared-types/affinity.types';
import { AffinityFormFields } from '../affinity-form.types';
import { SelectInput } from '@percona/ui-lib';
import { MenuItem } from '@mui/material';

type Props = {
  disabled: boolean;
};

const OperatorInput = ({ disabled }: Props) => (
  <SelectInput
    name={AffinityFormFields.operator}
    label="Operator"
    selectFieldProps={{
      sx: { width: '213px' },
      label: 'Operator',
      disabled,
    }}
    data-testid="operator-select"
  >
    {Object.values(AffinityOperator).map((value) => (
      <MenuItem key={value} value={value} data-testid={value}>
        {AffinityOperatorValue[value]}
      </MenuItem>
    ))}
  </SelectInput>
);

export default OperatorInput;
