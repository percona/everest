import ReplayIcon from '@mui/icons-material/Replay';
import {
  Box,
  Button,
  Skeleton,
  Stack,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import { DrawerContext } from 'contexts/drawer/drawer.context';
import { useKubernetesClusterInfo } from 'hooks/api/kubernetesClusters/useKubernetesClusterInfo';
import useLocalStorage from 'hooks/utils/useLocalStorage';
import { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from 'utils/ErrorBoundary';
import { AppBar } from '../app-bar/AppBar';
import { Drawer } from '../drawer/Drawer';
import { WelcomeDialog } from '../welcome-dialog/welcome-dialog';
import { Messages } from './Main.messages';

export const Main = () => {
  const theme = useTheme();
  const [openWelcomeDialogLS, setOpenWelcomeDialogLS] = useLocalStorage(
    'welcomeModal',
    true
  );
  const { activeBreakpoint } = useContext(DrawerContext);
  const { isFetching, isError, refetch } = useKubernetesClusterInfo([
    'initial-k8-info',
  ]);

  const handleCloseWelcomeDialog = () => {
    setOpenWelcomeDialogLS(false);
  };

  const handleClick = () => {
    refetch();
  };

  const drawerWidth = theme.breakpoints.up('sm')
    ? `calc(${theme.spacing(8)} + 1px)`
    : `calc(${theme.spacing(7)} + 1px)`;

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar />
      <Drawer />
      <Box
        component="main"
        sx={{
          padding: 4,
          width:
            activeBreakpoint === 'mobile'
              ? '100%'
              : `calc(100% - ${drawerWidth})`,
        }}
      >
        <Toolbar />
        {isFetching ? (
          <>
            <Skeleton variant="rectangular" />
            <Skeleton variant="rectangular" />
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton variant="rectangular" />
          </>
        ) : isError ? (
          <Stack alignItems="center">
            <Typography variant="subtitle1">
              {Messages.somethingWrong}
            </Typography>
            <Button
              onClick={handleClick}
              variant="outlined"
              endIcon={<ReplayIcon />}
              sx={{ mt: 1 }}
            >
              {Messages.retry}
            </Button>
          </Stack>
        ) : (
          <ErrorBoundary fallback={<div>Error</div>}>
            <Outlet />
          </ErrorBoundary>
        )}
        {openWelcomeDialogLS && (
          <WelcomeDialog
            open={openWelcomeDialogLS}
            closeDialog={handleCloseWelcomeDialog}
          />
        )}
      </Box>
    </Box>
  );
};
