import { FormDialog } from 'components/form-dialog';
import { Messages } from './affinity-form-dialog.messages';
import { AffinityFormDialogContext } from './affinity-form-dialog-context/affinity-form-context';
import { affinityFormSchema } from './affinity-form/affinity-form.types';
import { affinityModalDefaultValues } from './affinity-form-dialog.utils';
import { AffinityForm } from './affinity-form/affinity-form';
import { useContext, useMemo } from 'react';

export const AffinityFormDialog = () => {
  const {
    openAffinityModal,
    handleClose,
    handleSubmit,
    affinityRules,
    selectedAffinityUid,
  } = useContext(AffinityFormDialogContext);

  const isEditing = selectedAffinityUid !== null;

  const selectedAffinityRule = useMemo(() => {
    if (isEditing) {
      return affinityRules.find(({ uid }) => uid === selectedAffinityUid);
    }
  }, [affinityRules, isEditing, selectedAffinityUid]);

  const values = useMemo(() => {
    return affinityModalDefaultValues(selectedAffinityRule);
  }, [selectedAffinityRule]);

  return (
    <FormDialog
      schema={affinityFormSchema}
      isOpen={!!openAffinityModal}
      closeModal={handleClose}
      headerMessage={isEditing ? Messages.editRule : Messages.addRule}
      onSubmit={handleSubmit}
      submitMessage={isEditing ? Messages.editRule : Messages.addRule}
      {...(isEditing && { values })}
      defaultValues={values}
      size="XXL"
      dataTestId={`affinity-form`}
    >
      <AffinityForm />
    </FormDialog>
  );
};
