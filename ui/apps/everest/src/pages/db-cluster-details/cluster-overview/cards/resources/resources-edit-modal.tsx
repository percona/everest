import { DbType } from '@percona/types';
import { SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { ResourcesForm, resourcesFormSchema } from 'components/cluster-form';
import { FormDialog } from 'components/form-dialog';
type Props = {
  handleCloseModal: () => void;
  dbType: DbType;
  onSubmit: SubmitHandler<z.infer<ReturnType<typeof resourcesFormSchema>>>;
  defaultValues: z.infer<ReturnType<typeof resourcesFormSchema>>;
};

const ResourcesEditModal = ({
  handleCloseModal,
  dbType,
  onSubmit,
  defaultValues,
}: Props) => {
  return (
    <FormDialog
      size="XXXL"
      isOpen
      closeModal={handleCloseModal}
      headerMessage="Edit Topology"
      submitMessage="Save"
      schema={resourcesFormSchema()}
      onSubmit={onSubmit}
      defaultValues={defaultValues}
    >
      <ResourcesForm
        dbType={dbType}
        pairProxiesWithNodes={false}
        showSharding={false}
        disableDiskInput
        allowDiskInputUpdate={false}
        showProxies={dbType !== DbType.Mongo}
      />
    </FormDialog>
  );
};

export default ResourcesEditModal;
