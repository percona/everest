import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import { DialogTitle } from '@percona/ui-lib';
import { DbCluster } from 'shared-types/dbCluster.types';
import { Messages } from './db-status-details-dialog.messages';

interface DbStatusDetailsModalProps {
  isOpen: boolean;
  closeModal: () => void;
  dbClusterDetails: NonNullable<DbCluster['status']>['details'];
}
const DbStatusDetailsDialog = ({
  isOpen,
  closeModal,
  dbClusterDetails,
}: DbStatusDetailsModalProps) => {
  return (
    <Dialog
      open={isOpen}
      onClose={closeModal}
      data-testid="db-status-details-modal"
    >
      <DialogTitle onClose={closeModal}>{Messages.headerMessage}</DialogTitle>
      <DialogContent sx={{ whiteSpace: 'pre-wrap' }}>
        <Typography variant="body1">{dbClusterDetails}</Typography>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          onClick={closeModal}
          data-testid={`db-status-details-modal`}
        >
          {Messages.cancelMessage}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DbStatusDetailsDialog;
