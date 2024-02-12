import { AutoCompleteInput } from '@percona/ui-lib';
import { useFormContext } from 'react-hook-form';
import { Checkbox, createFilterOptions } from '@mui/material';
import { AutoCompleteSelectAllTypes } from './auto-complete-select-all.types';
import { Messages } from './auto-complete-select-all.messages';

export function AutoCompleteSelectAll<T>({
  name,
  controllerProps,
  label,
  labelProps,
  autoCompleteProps,
  textFieldProps,
  options,
  loading,
  isRequired,
  disabled,
  optionLabelName,
}: AutoCompleteSelectAllTypes<string | T>) {
  const { setValue, watch, trigger } = useFormContext();
  const fieldValue = watch(name);

  return (
    <AutoCompleteInput
      name={name}
      controllerProps={controllerProps}
      label={label}
      labelProps={labelProps}
      loading={loading}
      options={options}
      textFieldProps={textFieldProps}
      autoCompleteProps={{
        multiple: true,
        disableCloseOnSelect: true,
        filterOptions: (options, params): (string | T)[] => {
          const filter = createFilterOptions<T | string>();
          const filtered = filter(options, params);
          return [Messages.selectAll, ...filtered];
        },
        onChange: (_event, newValue) => {
          if (
            Array.isArray(newValue) &&
            newValue.find((option) => option === Messages.selectAll)
          ) {
            setValue(name, fieldValue.length === options.length ? [] : options);
            trigger(name);
          } else {
            setValue(name, newValue);
            trigger(name);
          }
        },
        renderOption: (props, option, { selected }) => {
          return (
            <li {...props}>
              <Checkbox
                style={{ marginRight: 8 }}
                checked={
                  option === Messages.selectAll
                    ? options.length === fieldValue.length
                    : selected
                }
              />
              {
                // @ts-ignore
                typeof option === 'string' ? option : option[optionLabelName]
              }
            </li>
          );
        },
        getOptionLabel: (option) =>
          // @ts-ignore
          typeof option === 'string' ? option : option[optionLabelName],
        ...autoCompleteProps,
      }}
      isRequired={isRequired}
      disabled={disabled}
    />
  );
}
