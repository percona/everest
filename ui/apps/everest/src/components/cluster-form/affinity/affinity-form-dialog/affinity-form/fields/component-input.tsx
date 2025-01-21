import { SelectInput } from '@percona/ui-lib';
import { DbType } from '@percona/types';
import { MenuItem } from '@mui/material';
import { AffinityFormFields } from '../affinity-form.types';
import { AffinityComponent } from 'shared-types/affinity.types';
import { getAffinityComponentLabel } from 'utils/db';

type Props = {
  disabled: boolean;
  components: AffinityComponent[];
  dbType: DbType;
};

const ComponentInput = ({ disabled, components, dbType }: Props) => (
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
        {getAffinityComponentLabel(dbType, value)}
      </MenuItem>
    ))}
  </SelectInput>
);

export default ComponentInput;
