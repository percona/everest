import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const DeletedDbDialog = ({ dbClusterName }: { dbClusterName: string }) => {
  const navigate = useNavigate();

  return (
    <Dialog open>
      <DialogTitle>Database deleted</DialogTitle>
      <DialogContent>
        The database <b>{dbClusterName}</b> has been deleted successfully. This
        action is irreversible, and all associated data is permanently removed.
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={() => navigate('/databases')}>
          Go to DB list
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeletedDbDialog;
