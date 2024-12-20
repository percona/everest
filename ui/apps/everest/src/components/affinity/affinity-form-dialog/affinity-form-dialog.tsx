import { FormDialog } from 'components/form-dialog';
import { Messages } from './affinity-form-dialog.messages';
import { AffinityFormDialogContext } from './affinity-form-dialog-context/affinity-form-context';
import { affinityFormSchema } from './affinity-form/affinity-form.types';
import { affinityModalDefaultValues } from './affinity-form-dialog.utils';
import { AffinityForm } from './affinity-form/affinity-form';
import { useContext, useMemo } from 'react';

export const AffinityFormDialog = () => {
  const {
    mode,
    openAffinityModal,
    handleClose,
    handleSubmit,
    affinityRules,
    selectedAffinityId,
  } = useContext(AffinityFormDialogContext);

  const selectedAffinityRule = useMemo(() => {
    if (mode === 'edit') {
      return affinityRules.find((_, idx) => idx === selectedAffinityId);
    }
  }, [affinityRules, mode, selectedAffinityId]);

  const values = useMemo(() => {
    return affinityModalDefaultValues(mode, selectedAffinityRule);
  }, [mode, selectedAffinityRule]);

  return (
    <FormDialog
      schema={affinityFormSchema()}
      isOpen={!!openAffinityModal}
      closeModal={handleClose}
      headerMessage={mode === 'new' ? Messages.addRule : Messages.editRule}
      onSubmit={handleSubmit}
      submitMessage={mode === 'new' ? Messages.addRule : Messages.editRule}
      {...(mode === 'edit' && { values })}
      defaultValues={values}
      size="XXL"
      dataTestId={`${mode}-affinity-form`}
    >
      <AffinityForm />
    </FormDialog>
  );
};
