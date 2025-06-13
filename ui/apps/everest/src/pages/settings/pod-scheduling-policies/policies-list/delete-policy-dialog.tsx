import { CustomConfirmDialog } from 'components/custom-confirm-dialog';

type Props = {
  isOpen: boolean;
  policyName: string;
  submitting?: boolean;
  policyInUse?: boolean;
  handleConfirmDelete?: () => void;
  handleCloseDeleteDialog?: () => void;
};
const DeletePolicyDialog = ({
  isOpen,
  policyName,
  submitting,
  policyInUse = false,
  handleConfirmDelete = () => {},
  handleCloseDeleteDialog = () => {},
}: Props) => (
  <CustomConfirmDialog
    alertTitle={policyInUse ? 'Policy in use' : undefined}
    confirmationInput={!policyInUse}
    disableSubmit={policyInUse}
    inputLabel="Policy name"
    inputPlaceholder="Policy name"
    selectedId={policyName}
    isOpen={isOpen}
    closeModal={handleCloseDeleteDialog}
    headerMessage="Delete policy"
    submitting={submitting}
    handleConfirm={handleConfirmDelete}
    alertMessage={
      policyInUse
        ? 'This policy is currently in use by one or more clusters. Please unassign it first before deleting.'
        : 'This action will permanently delete your policy and affect all the clusters using it.'
    }
    dialogContent={
      !policyInUse && (
        <>
          Are you sure you want to permanently delete <b>{policyName}</b>{' '}
          policy? To confirm this action, type the name of your policy.
        </>
      )
    }
    hideCheckbox
  />
);

export default DeletePolicyDialog;
