import { FormDialog } from 'components/form-dialog';
import { Messages } from './affinity-form-dialog.messages';
import { affinityFormSchema } from './affinity-form/affinity-form.types';
import { AffinityForm } from './affinity-form/affinity-form';
import { DbType } from '@percona/types';
import { affinityModalDefaultValues } from './affinity-form-dialog.utils';
import { AffinityRule } from 'shared-types/affinity.types';

type Props = {
  isOpen: boolean;
  dbType: DbType;
  defaultValues?: AffinityRule;
  submitting?: boolean;
  showInUseWarning?: boolean;
  handleClose?: () => void;
  handleSubmit?: (values: AffinityRule) => void;
};

export const AffinityFormDialog = ({
  isOpen,
  dbType,
  defaultValues,
  submitting,
  showInUseWarning = false,
  handleClose = () => {},
  handleSubmit = () => {},
}: Props) => {
  const isEditing = !!defaultValues;

  return (
    <FormDialog
      schema={affinityFormSchema}
      isOpen={isOpen}
      submitting={submitting}
      closeModal={handleClose}
      headerMessage={isEditing ? Messages.editRule : Messages.addRule}
      onSubmit={handleSubmit}
      submitMessage={isEditing ? 'Save' : 'Add'}
      //@ts-ignore
      defaultValues={defaultValues ?? affinityModalDefaultValues()}
      size="XXL"
      dataTestId={`affinity-form`}
    >
      <AffinityForm dbType={dbType} showInUseWarning={showInUseWarning} />
    </FormDialog>
  );
};
