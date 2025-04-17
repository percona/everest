import { FormDialog } from 'components/form-dialog';
import { Messages } from './affinity-form-dialog.messages';
import { affinityFormSchema } from './affinity-form/affinity-form.types';
import { AffinityForm } from './affinity-form/affinity-form';
import { DbType } from '@percona/types';
import { affinityModalDefaultValues } from './affinity-form-dialog.utils';

type Props = {
  isOpen: boolean;
  dbType: DbType;
  handleClose?: () => void;
  handleSubmit?: () => void;
};

export const AffinityFormDialog = ({
  isOpen,
  dbType,
  handleClose = () => {},
  handleSubmit = () => {},
}: Props) => {
  const isEditing = false;

  // const values = useMemo(() => {
  //   return affinityModalDefaultValues(selectedAffinityRule);
  // }, [selectedAffinityRule]);

  return (
    <FormDialog
      schema={affinityFormSchema}
      isOpen={isOpen}
      closeModal={handleClose}
      headerMessage={isEditing ? Messages.editRule : Messages.addRule}
      onSubmit={handleSubmit}
      submitMessage={isEditing ? Messages.editRule : Messages.addRule}
      // {...(isEditing && { values })}
      defaultValues={affinityModalDefaultValues()}
      size="XXL"
      dataTestId={`affinity-form`}
    >
      <AffinityForm dbType={dbType} />
    </FormDialog>
  );
};
