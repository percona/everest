import type { Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import Checkbox from './checkbox';
import { CheckboxProps } from './checkbox.types';
import { Stack } from '@mui/material';

type CustomArgs = CheckboxProps & {
  disabled?: boolean;
  size?: 'small' | 'medium';
  required?: boolean;
  indeterminate?: boolean
};

const meta = {
  title: 'Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },

  argTypes: {
    label: {
      type: 'string',
    },
    disabled: {
      type: 'boolean',
    },
    size: {
      options: ['small', 'medium'],
      control: { type: 'inline-radio' },
    },
    required: {
      type: 'boolean',
    },
    indeterminate: {
      type: 'boolean',
    },
  },

  render: function Render({ label, disabled, size, required, indeterminate }) {
    const methods = useForm();

    return (
      <FormProvider {...methods}>
        <Stack direction={'row'} columnGap={'20px'} justifyContent={'center'}>
          <Checkbox
            name="checkbox"
            label="small"
            checkboxProps={{ size: 'small' }}
          />
          <Checkbox
            name="checkbox"
            label="checked"
            checkboxProps={{ size: 'small', defaultChecked: true }}
          />
          <Checkbox
            name="checkbox"
            label="disabled"
            checkboxProps={{ size: 'small', disabled: true }}
          />
          <Checkbox
            name="checkbox"
            label="indeterminate"
            checkboxProps={{ size: 'small', indeterminate: true }}
          />
        </Stack>
        <Stack direction={'row'} columnGap={'20px'} justifyContent={'center'}>
          <Checkbox
            name="checkbox"
            label="medium"
            checkboxProps={{ size: 'medium' }}
          />
          <Checkbox
            name="checkbox"
            label="checked"
            checkboxProps={{ size: 'medium', defaultChecked: true }}
          />
          <Checkbox
            name="checkbox"
            label="disabled"
            checkboxProps={{ size: 'medium', disabled: true }}
          />
          <Checkbox
            name="checkbox"
            label="indeterminate"
            checkboxProps={{ size: 'medium', indeterminate: true }}
          />
        </Stack>
        <Stack alignItems={'center'}>
          <Checkbox
            name="custom"
            label={label}
            checkboxProps={{ disabled, size, indeterminate }}
            labelProps={{ isRequired: required }}
          />
        </Stack>
      </FormProvider>
    );
  },
} satisfies Meta<CustomArgs>;

export default meta;

type Story = StoryObj<CustomArgs>;

export const Basic: Story = {
  args: {
    label: 'Custom',
    disabled: false,
    size: 'medium',
    required: false,
    indeterminate: false
  },
};
