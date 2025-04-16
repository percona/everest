import { FormProvider, useForm } from 'react-hook-form';
import { AffinityFormDialogContext } from './affinity-form-dialog-context/affinity-form-context';
import { affinityFormSchema } from './affinity-form/affinity-form.types';
import { affinityModalDefaultValues } from './affinity-form-dialog.utils';
import { AffinityForm } from './affinity-form/affinity-form';
import { useContext, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextInput } from '@percona/ui-lib';

export const AffinityTemplateForm = () => {
  // const { handleSubmit, affinityRules, selectedAffinityUid } = useContext(
  //   AffinityFormDialogContext
  // );
  // const isEditing = selectedAffinityUid !== null;

  // const selectedAffinityRule = useMemo(() => {
  //   if (isEditing) {
  //     return affinityRules.find(({ uid }) => uid === selectedAffinityUid);
  //   }
  // }, [affinityRules, isEditing, selectedAffinityUid]);

  // const defaultValues = useMemo(() => {
  //   return affinityModalDefaultValues(selectedAffinityRule);
  // }, [selectedAffinityRule]);

  const methods = useForm({
    resolver: zodResolver(affinityFormSchema),
    // defaultValues,
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(() => {})}>
        <TextInput name="templateName" label="Template name" />
        <AffinityForm />
      </form>
    </FormProvider>
  );
};
