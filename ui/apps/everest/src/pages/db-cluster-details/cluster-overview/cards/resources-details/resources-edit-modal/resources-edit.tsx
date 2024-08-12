import { FormDialog } from 'components/form-dialog/form-dialog';
import { SubmitHandler } from 'react-hook-form';
import {
  EditResourceDialogType,
  ResourcesEditDialogProps,
} from './resources-edit.types';
import { resourcesSchema } from '../../../../../database-form/database-form-schema';
import { Messages } from './resources-edit.messages';
import { ResourcesFormFields } from '../../../../../database-form/database-form-body/steps/resources/resources-fields';
import { dbEngineToDbType } from '@percona/utils';
import { ResourcesEditModalContent } from './resources-edit-modal-content';

export const ResourcesEditModal = ({
  open,
  handleCloseModal,
  handleSubmitModal,
  dbCluster,
}: ResourcesEditDialogProps) => {
  const onSubmit: SubmitHandler<EditResourceDialogType> = ({
    cpu,
    memory,
    disk,
    numberOfNodes,
  }) => {
    handleSubmitModal(cpu, memory, disk, +numberOfNodes);
  };

  return (
    <FormDialog
      size="XL"
      isOpen={open}
      closeModal={handleCloseModal}
      schema={resourcesSchema}
      headerMessage={Messages.modalHeader}
      onSubmit={onSubmit}
      submitMessage={Messages.save}
    >
      <ResourcesEditModalContent dbCluster={dbCluster} />
    </FormDialog>
  );
};
