import { TextInput } from '@percona/ui-lib';
import { DbCredentialsSectionProps } from '../../import.types';
import { useFormContext } from 'react-hook-form';

export const DbCredentialsForm = ({
  secretKeys = [],
}: DbCredentialsSectionProps) => {
  const { register } = useFormContext();
  return (
    <>
      {secretKeys.map((field) => (
        <TextInput
          key={field.name}
          label={field.name}
          {...register(`credentials.${field.name}`, {
            required: 'This field is required',
            minLength: {
              value: 1,
              message: 'Must be at least 1 character',
            },
            maxLength: {
              value: 250,
              message: 'Must be at most 250 characters',
            },
          })}
        />
      ))}
    </>
  );
};
