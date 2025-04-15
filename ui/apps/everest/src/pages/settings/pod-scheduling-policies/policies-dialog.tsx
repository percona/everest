import {
  AppBar,
  Box,
  Button,
  Dialog,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

type Props = {
  open: boolean;
  onClose: () => void;
};

const PoliciesDialog = ({ open, onClose }: Props) => {
  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar>
          <IconButton edge="start" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
          <Typography color="text.primary" sx={{ ml: 2, flex: 1 }} variant="h5">
            Create pod scheduling policy
          </Typography>
          <Box sx={{ display: 'flex', gap: '10px' }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={onClose}>
              Save
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
    </Dialog>
  );
};

export default PoliciesDialog;
