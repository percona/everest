import { CustomConfirmDialog } from 'components/custom-confirm-dialog';
import { messages } from '../load-balancer.messages';

interface DeleteLoadBalancerConfigProps {
  isOpen: boolean;
  configName: string;
  configInUse?: boolean;
  handleCloseDeleteDialog: () => void;
  handleConfirmDelete: () => void;
}

const DeleteLoadBalancerConfig = ({
  isOpen,
  configName,
  configInUse = false,
  handleCloseDeleteDialog,
  handleConfirmDelete,
}: DeleteLoadBalancerConfigProps) => {
  return (
    <CustomConfirmDialog
      alertTitle={configInUse ? 'Config in use' : undefined}
      confirmationInput={!configInUse}
      disableSubmit={configInUse}
      inputLabel="Config name"
      inputPlaceholder="Config name"
      selectedId={configName}
      isOpen={isOpen}
      closeModal={handleCloseDeleteDialog}
      headerMessage="Delete config"
      handleConfirm={handleConfirmDelete}
      alertMessage={
        configInUse
          ? messages.deleteDialog.alertMessage.inUse
          : messages.deleteDialog.alertMessage.notInUse
      }
      dialogContent={
        !configInUse && (
          <>
            {messages.deleteDialog.dialogContent.firstPart} <b>{configName}</b>{' '}
            {messages.deleteDialog.dialogContent.secondPart}
          </>
        )
      }
      hideCheckbox
    />
  );
};

export default DeleteLoadBalancerConfig;
