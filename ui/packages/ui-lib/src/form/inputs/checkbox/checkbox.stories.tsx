import type { Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import Checkbox from './checkbox';
import { CheckboxProps } from './checkbox.types';

type CustomArgs = CheckboxProps & {
  disabled?: boolean;
	size?: 'small' | 'medium',
	required?: boolean
};

const meta = {
  title: 'Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },

	argTypes: {
		label: {
			type: 'string'
		},
    disabled: {
			type: 'boolean'
		},
		size: {
			options: ['small', 'medium'],
      control: { type: 'inline-radio' },
    },
		required: {
			type: 'boolean'
		},
	},

  render: function Render({ label, disabled, size, required }) {
    const methods = useForm();

    return (
      <FormProvider {...methods}>
        <Checkbox
          name="checkbox"
          label={label}
          checkboxProps={{ disabled, size}}
					labelProps={{isRequired: required}}
        />
      </FormProvider>
    );
  },
} satisfies Meta<CustomArgs>;

export default meta;

type Story = StoryObj<CustomArgs>;

export const Basic: Story = {
  args: {
    label: 'Label',
    disabled: false,
		size: 'medium',
		required: false
  },
};
