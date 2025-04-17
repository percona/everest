import { CustomConfirmDialog } from 'components/custom-confirm-dialog';

type Props = {
  isOpen: boolean;
  policyName: string;
  submitting?: boolean;
  handleConfirmDelete?: () => void;
  handleCloseDeleteDialog?: () => void;
};
const DeletePolicyDialog = ({
  isOpen,
  policyName,
  submitting,
  handleConfirmDelete = () => {},
  handleCloseDeleteDialog = () => {},
}: Props) => (
  <CustomConfirmDialog
    inputLabel="Policy name"
    inputPlaceholder="Policy name"
    isOpen={isOpen}
    closeModal={handleCloseDeleteDialog}
    headerMessage="Delete policy"
    submitting={submitting}
    handleConfirm={handleConfirmDelete}
    alertMessage="This action will permanently delete your policy and affect all the clusters using it."
    dialogContent={
      <>
        Are you sure you want to permanently delete <b>{policyName}</b> policy?
        To confirm this action, type the name of your policy.
      </>
    }
    hideCheckbox
  />
);

export default DeletePolicyDialog;
