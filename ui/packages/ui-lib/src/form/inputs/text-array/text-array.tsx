// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useEffect, useState } from 'react';
import { FieldError, useFieldArray, useFormContext } from 'react-hook-form';
import { IconButton, InputAdornment } from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

import { TextArrayProps } from './text-array.types';
import TextInput from '../text';
import ActionableLabeledContent from '../../../actionable-labeled-content';

const TextArray = ({
  fieldName,
  fieldKey,
  label,
  placeholder,
  handleBlur,
}: TextArrayProps) => {
  const {
    control,
    formState: { errors },
    watch,
  } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  });

  const [isDisabled, setIsDisabled] = useState<boolean>(true);
  const defaultFields: Record<string, string>[] = fields.length ? fields : [];
  const [changed, setChanged] = useState(false);
  const error = (index: number): FieldError | undefined =>
    // @ts-ignore
    errors?.[fieldName]?.[index]?.[fieldKey];

  useEffect(() => {
    const isAnyFieldEmpty = defaultFields.some(
      (field) => field[fieldKey] === ''
    );

    setIsDisabled(isAnyFieldEmpty);
  }, [defaultFields.length, changed]);

  return (
    <>
      <ActionableLabeledContent
        label={label}
        actionButtonProps={{
          disabled: isDisabled,
          dataTestId: 'add-text-input-button',
          onClick: () => {
            setIsDisabled(true);
            append({
              [fieldKey]: '',
            });
          },
        }}
      >
        {defaultFields.map((field, index) => (
          <TextInput
            control={control}
            name={`${fieldName}.${index}.${fieldKey}`}
            key={`${fieldName}_${field.id}`}
            textFieldProps={{
              variant: 'outlined',
              placeholder,
              error: !!error(index),
              helperText: error(index) ? error(index)?.message : '',
              sx: {
                width: '100%',
                '&:not(:last-child)': {
                  mb: 1,
                },
              },

              InputProps: {
                onChange: () => {
                  const initialFieldValue = watch(
                    `${fieldName}.${index}.${fieldKey}`
                  );
                  defaultFields[index][fieldKey] = initialFieldValue;
                  setChanged((prev) => !prev);
                },
                onBlur: handleBlur
                  ? (e) => {
                      handleBlur(
                        e.target.value,
                        `${fieldName}.${index}.${fieldKey}`,
                        !!error(index)
                      );
                    }
                  : undefined,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      data-testid={`delete-text-input-${index}-button`}
                      onClick={() => remove(index)}
                    >
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        ))}
      </ActionableLabeledContent>
    </>
  );
};

export default TextArray;
