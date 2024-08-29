import { Button, Dialog, DialogActions, DialogContent } from '@mui/material';
import { DialogTitle } from '@percona/ui-lib';
import { ConfirmDialogProps } from './confirm-dialog.types';
import { kebabize } from '@percona/utils';

export const ConfirmDialog = ({
  isOpen,
  closeModal,
  selectedId,
  selectedNamespace,
  children: content,
  handleConfirm = () => {},
  handleConfirmNamespace = () => {},
  headerMessage,
  cancelMessage = 'Cancel',
  submitMessage = 'Delete',
  disabledButtons = false,
}: ConfirmDialogProps) => {
  const onClick = () => {
    if (selectedNamespace) {
      handleConfirmNamespace(selectedId, selectedNamespace);
    } else {
      handleConfirm(selectedId);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={closeModal}
      data-testid={`${selectedId}-confirm-dialog`}
    >
      <DialogTitle onClose={closeModal}>{headerMessage}</DialogTitle>
      <DialogContent sx={{ width: '480px' }}>{content}</DialogContent>
      <DialogActions>
        <Button
          onClick={closeModal}
          disabled={disabledButtons}
          data-testid={`confirm-dialog-${kebabize(cancelMessage)}`}
        >
          {cancelMessage}
        </Button>
        <Button
          variant="contained"
          onClick={onClick}
          disabled={disabledButtons}
          data-testid={`confirm-dialog-${kebabize(submitMessage)}`}
        >
          {submitMessage}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
