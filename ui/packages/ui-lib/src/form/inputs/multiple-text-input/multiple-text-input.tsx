import { Box, Button, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { FieldError, useFieldArray, useFormContext } from 'react-hook-form';
import TextInput from '../text';
import { useEffect } from 'react';

interface MultipleTextInputProps {
  fieldName: string;
  buttonProps?: {
    buttonText?: string;
  };
  getValues?: (values: Record<string, string>[]) => void;
}

const MultipleTextInput = ({
  fieldName,
  buttonProps,
  getValues,
}: MultipleTextInputProps) => {
  const {
    control,
    formState: { errors },
    watch,
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  });

  const values = watch(fieldName) || [];

  useEffect(() => {
    if (getValues && values.length > 0) {
      getValues(values);
    }
  }, [values, getValues]);

  const lastRow = values[values.length - 1];
  const isDisabled = !lastRow?.key || !lastRow?.value;

  const error = (index: number, key: 'key' | 'value'): FieldError | undefined =>
    // @ts-ignore
    errors?.[fieldName]?.[index]?.[key];

  useEffect(() => {
    if (fields.length === 0) {
      append({ key: '', value: '' });
    }
  }, [fields, append]);

  const handleAdd = () => {
    append({ key: '', value: '' });
  };

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
      }}
    >
      {fields.map((field, index) => (
        <Box
          key={field.id}
          sx={{
            width: '100%',
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TextInput
            name={`${fieldName}.${index}.key`}
            control={control}
            textFieldProps={{
              variant: 'outlined',
              placeholder: 'Enter key',
              error: !!error(index, 'key'),
              helperText: error(index, 'key')?.message,
              sx: {
                width: '100%',
                mt: 1,
              },
            }}
          />

          <TextInput
            name={`${fieldName}.${index}.value`}
            control={control}
            textFieldProps={{
              variant: 'outlined',
              placeholder: 'Enter value',
              error: !!error(index, 'value'),
              helperText: error(index, 'value')?.message,
              sx: {
                width: '100%',
                mt: 1,
              },
            }}
          />

          <IconButton
            onClick={() => remove(index)}
            disabled={fields.length === 1}
          >
            <DeleteOutlineOutlinedIcon />
          </IconButton>
        </Box>
      ))}

      <Button
        variant="text"
        size="small"
        startIcon={<AddIcon />}
        disabled={isDisabled}
        onClick={handleAdd}
      >
        {buttonProps?.buttonText || 'Add new'}
      </Button>
    </Box>
  );
};

export default MultipleTextInput;
