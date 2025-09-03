import { Box, Button, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { FieldError, useFieldArray, useFormContext } from 'react-hook-form';
import TextInput from '../text';

interface MultipleTextInputProps {
  fieldName: string;
}

const MultipleTextInput = ({ fieldName }: MultipleTextInputProps) => {
  const {
    control,
    formState: { errors },
    getValues,
    setValue,
    trigger,
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  });

  const error = (index: number, key: 'key' | 'value'): FieldError | undefined =>
    // @ts-ignore
    errors?.[fieldName]?.[index]?.[key];

  const shouldDisableButtons = () => {
    const values = getValues(fieldName);
    const fieldErrors = errors?.[fieldName];

    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      return true;
    }

    const hasEmptyFields = values.some(
      (item: { key: string; value: string }) => !item.key || !item.value
    );
    if (hasEmptyFields) {
      return true;
    }

    const keys = values
      .map((item: { key: string; value: string }) => item.key)
      .filter(Boolean);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
      return true;
    }

    return false;
  };

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
              onChange: () => {
                trigger();
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
              onChange: () => {
                trigger();
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
              trigger();
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
        disabled={shouldDisableButtons()}
        onClick={handleAdd}
      >
        Add new
      </Button>
    </Box>
  );
};

export default MultipleTextInput;
