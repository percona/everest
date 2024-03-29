import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { kebabize } from '@percona/utils';
import { Controller, useFormContext } from 'react-hook-form';
import { SelectInputProps } from './select.types';
import { Messages } from './select.messages';

const SelectInput = ({
  name,
  control,
  label,
  controllerProps,
  selectFieldProps,
  formControlProps,
  children,
}: SelectInputProps) => {
  const { control: contextControl } = useFormContext();

  return (
    <FormControl
      sx={{ mt: 2 }}
      size={formControlProps?.size || 'small'}
      {...formControlProps}
    >
      <InputLabel id={`${name}-input-label`}>{label}</InputLabel>
      <Controller
        name={name}
        control={control ?? contextControl}
        render={({ field, fieldState: { error } }) => (
          <Select
            {...field}
            label={label}
            labelId="demo-simple-select-label"
            variant="outlined"
            error={error !== undefined}
            data-testid={`select-${kebabize(name)}-button`}
            inputProps={{
              'data-testid': `select-input-${kebabize(name)}`,
              ...selectFieldProps?.inputProps,
            }}
            {...selectFieldProps}
          >
            {children}
            {(!children || (Array.isArray(children) && !children.length)) && (
              <MenuItem
                disabled
                key="noOptions"
                value=""
                data-testid="no-options-select"
                sx={{
                  fontWeight: '400',
                  '&.Mui-disabled.Mui-selected': {
                    backgroundColor: 'transparent',
                  },
                }}
              >
                {Messages.noOptions}
              </MenuItem>
            )}
          </Select>
        )}
        {...controllerProps}
      />
    </FormControl>
  );
};

export default SelectInput;
