import { Button, Dialog, DialogActions, DialogContent } from '@mui/material';
import { DialogTitle } from '@percona/ui-lib';
import { ConfirmDialogProps } from './confirm-dialog.types';
import { kebabize } from '@percona/utils';

export const ConfirmDialog = ({
  closeModal,
  selectedId,
  selectedNamespace,
  children: content,
  handleConfirm = () => {},
  handleConfirmNamespace = () => {},
  headerMessage,
  cancelMessage,
  submitMessage = 'Delete',
  disabledButtons = false,
  ...dialogProps
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
      onClose={closeModal}
      data-testid={`${selectedId}-confirm-dialog`}
      maxWidth="sm"
      {...dialogProps}
      open={dialogProps.open}
    >
      <DialogTitle onClose={closeModal}>{headerMessage}</DialogTitle>
      <DialogContent>{content}</DialogContent>
      <DialogActions>
        {!!cancelMessage && (
          <Button
            onClick={closeModal}
            disabled={disabledButtons}
            data-testid={`confirm-dialog-${kebabize(cancelMessage)}`}
          >
            {cancelMessage}
          </Button>
        )}
        {!!submitMessage && (
          <Button
            variant="contained"
            onClick={onClick}
            disabled={disabledButtons}
            data-testid={`confirm-dialog-${kebabize(submitMessage)}`}
          >
            {submitMessage}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
