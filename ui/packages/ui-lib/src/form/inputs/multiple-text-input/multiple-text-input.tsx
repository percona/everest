import { Box, Button, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { FieldError, useFieldArray, useFormContext } from 'react-hook-form';
import TextInput from '../text';
import { useState } from 'react';

interface MultipleTextInputProps {
  fieldName: string;
}

const MultipleTextInput = ({ fieldName }: MultipleTextInputProps) => {
  const {
    control,
    formState: { errors },
    getValues,
    setValue,
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  });

  const error = (index: number, key: 'key' | 'value'): FieldError | undefined =>
    // @ts-ignore
    errors?.[fieldName]?.[index]?.[key];

  const [isLastLineEmpty, setIsLastLineEmpty] = useState(false);

  const handleAdd = () => {
    append({ key: '', value: '' });
    setIsLastLineEmpty(true);
  };

  const checkIfLastLineEmpty = (value: string, field: 'key' | 'value') => {
    const values = getValues(fieldName);
    if (
      value === '' ||
      values[values.length - 1][field === 'key' ? 'value' : 'key'] === ''
    ) {
      return true;
    } else {
      return false;
    }
  };

  const handleOnChange = async (
    value: string,
    __: number,
    field: 'key' | 'value'
  ) => {
    const lastLineEmpty = checkIfLastLineEmpty(value, field);

    setIsLastLineEmpty(lastLineEmpty);

    return value;
  };

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 2,
        pt: 2,
      }}
    >
      {fields.map((field, index) => (
        <Box
          key={field.id}
          sx={{
            width: '100%',
            display: 'flex',
            gap: 1,
            alignItems: 'flex-start',
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
                mt: 0,
              },
              onChange: (e) => {
                handleOnChange(e.target.value, index, 'key');
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
                mt: 0,
              },
              onChange: (e) => {
                handleOnChange(e.target.value, index, 'value');
              },
            }}
          />
          <IconButton
            onClick={() => {
              const values = getValues(fieldName);

              if (values.length === 1) {
                setValue(`${fieldName}.${index}.key`, '');
                setValue(`${fieldName}.${index}.value`, '');
              } else {
                remove(index);
              }
            }}
          >
            <DeleteOutlineOutlinedIcon />
          </IconButton>
        </Box>
      ))}

      <Button
        variant="text"
        size="small"
        startIcon={<AddIcon />}
        disabled={isLastLineEmpty || !!errors?.[fieldName]}
        onClick={handleAdd}
      >
        Add new
      </Button>
    </Box>
  );
};

export default MultipleTextInput;
