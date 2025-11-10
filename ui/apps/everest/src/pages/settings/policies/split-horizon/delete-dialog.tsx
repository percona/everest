import { CustomConfirmDialog } from 'components/custom-confirm-dialog';

type Props = {
  configName: string;
  submitting?: boolean;
  handleConfirmDelete?: () => void;
  handleCloseDeleteDialog?: () => void;
};
const DeleteSplitHorizonConfigDialog = ({
  configName,
  submitting,
  handleConfirmDelete = () => {},
  handleCloseDeleteDialog = () => {},
}: Props) => (
  <CustomConfirmDialog
    inputLabel="Config name"
    inputPlaceholder="Config name"
    selectedId={configName}
    isOpen
    closeModal={handleCloseDeleteDialog}
    headerMessage="Delete config"
    submitting={submitting}
    handleConfirm={handleConfirmDelete}
    alertMessage={
      'This action will permanently delete your configuration and affect all the clusters using it.'
    }
    dialogContent={
      <>
        Are you sure you want to permanently delete <b>{configName}</b> policy?
        To confirm this action, type the name of your policy.
      </>
    }
    hideCheckbox
  />
);

export default DeleteSplitHorizonConfigDialog;
