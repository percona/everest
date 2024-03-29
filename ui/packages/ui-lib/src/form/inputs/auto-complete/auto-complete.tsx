import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { kebabize } from '@percona/utils';
import { Controller, useFormContext } from 'react-hook-form';
import { AutoCompleteInputProps } from './auto-complete.types';

function AutoCompleteInput<T>({
  name,
  control,
  controllerProps,
  label,
  autoCompleteProps,
  textFieldProps,
  options,
  loading = false,
  isRequired = false,
  disabled = false,
  onChange,
}: AutoCompleteInputProps<T>) {
  const { control: contextControl } = useFormContext();
  return (
    <Controller
      name={name}
      control={control ?? contextControl}
      render={({ field, fieldState: { error } }) => (
        <Autocomplete
          {...field}
          sx={{ mt: 2 }}
          options={options}
          forcePopupIcon
          disabled={disabled}
          onChange={(_, newValue) => {
            field.onChange(newValue);
            if (onChange) {
              onChange();
            }
          }}
          data-testid={`${kebabize(name)}-autocomplete`}
          // We might generalize this in the future, if we think renderInput should be defined from the outside
          renderInput={(params) => (
            <TextField
              {...params}
              error={!!error}
              label={label}
              helperText={error ? error.message : textFieldProps?.helperText}
              inputProps={{
                'data-testid': `text-input-${kebabize(name)}`,
                ...params.inputProps,
                ...textFieldProps?.inputProps,
              }}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
              InputLabelProps={{
                shrink: true,
              }}
              size="small"
              required={isRequired}
              {...textFieldProps}
            />
          )}
          {...autoCompleteProps}
        />
      )}
      {...controllerProps}
    />
  );
}

export default AutoCompleteInput;
