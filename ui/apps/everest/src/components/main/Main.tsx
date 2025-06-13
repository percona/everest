import ReplayIcon from '@mui/icons-material/Replay';
import {
  Box,
  Button,
  Stack,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import { DrawerContext } from 'contexts/drawer/drawer.context';
import { useKubernetesClusterInfo } from 'hooks/api/kubernetesClusters/useKubernetesClusterInfo';
import useLocalStorage from 'hooks/utils/useLocalStorage';
import { GenericError } from 'pages/generic-error/GenericError';
import { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from 'utils/ErrorBoundary';
import { ErrorContextProvider } from 'utils/ErrorBoundaryProvider';
import { AppBar } from '../app-bar/AppBar';
import { Drawer } from '../drawer/Drawer';
import { WelcomeDialog } from '../welcome-dialog/welcome-dialog';
import { Messages } from './Main.messages';
import LoadingPageSkeleton from 'components/loading-page-skeleton/LoadingPageSkeleton';
import UpgradeEverestReloadDialog from 'modals/upgrade-reload-everest-dialog';
import { UpgradeEverestContext } from 'contexts/upgrade-everest';

export const Main = () => {
  const theme = useTheme();
  const [openWelcomeDialogLS, setOpenWelcomeDialogLS] = useLocalStorage(
    'welcomeModal',
    true
  );
  const { activeBreakpoint } = useContext(DrawerContext);
  const { apiVersion, openReloadDialog, setOpenReloadDialog } = useContext(
    UpgradeEverestContext
  );
  const { isFetching, isError, refetch } = useKubernetesClusterInfo(['k8s-info'], 'in-cluster');

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
    <ErrorContextProvider>
      <ErrorBoundary fallback={<GenericError />}>
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
              <LoadingPageSkeleton />
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
              <Outlet />
            )}
            {openWelcomeDialogLS && (
              <WelcomeDialog
                open={openWelcomeDialogLS}
                closeDialog={handleCloseWelcomeDialog}
              />
            )}
            <UpgradeEverestReloadDialog
              isOpen={openReloadDialog}
              closeModal={() => setOpenReloadDialog(false)}
              version={apiVersion || ''}
            />
          </Box>
        </Box>
      </ErrorBoundary>
    </ErrorContextProvider>
  );
};
