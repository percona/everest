import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import { DialogTitle } from '@percona/ui-lib';
import { useNavigate } from 'react-router-dom';
import { Messages } from '../database-form.messages';
import { DatabaseFormCancelDialogProps } from './DatabaseFormCancelDialog.types';

const DatabaseFormCancelDialog = ({
  open,
  onClose,
}: DatabaseFormCancelDialogProps) => {
  const navigate = useNavigate();

  const handleCancel = () => {
    navigate('/databases');
  };

  return (
    <Dialog open={open}>
      <DialogTitle onClose={onClose}>{Messages.dialog.title}</DialogTitle>
      <DialogContent>
        <Typography>{Messages.dialog.content}</Typography>
      </DialogContent>
      <DialogActions>
        <Button autoFocus variant="text" onClick={onClose}>
          {Messages.dialog.reject}
        </Button>
        <Button variant="contained" onClick={handleCancel}>
          {Messages.dialog.accept}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DatabaseFormCancelDialog;
