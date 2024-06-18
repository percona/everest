import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { ThemeContextProvider, everestThemeOptions } from '@percona/design';
import { NotistackMuiSnackbar } from '@percona/ui-lib';
import { SnackbarProvider } from 'notistack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from 'contexts/auth';
import { DrawerContextProvider } from 'contexts/drawer/drawer.context';
import router from 'router';
import { useEffect, useState } from 'react';
import { EverestConfig } from 'shared-types/configs.types';
import { getEverestConfigs } from 'api/everestConfigs';
import LoadingPageSkeleton from 'components/loading-page-skeleton/LoadingPageSkeleton';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [configs, setConfigs] = useState<EverestConfig | undefined | null>();

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const { oidcConfig = { clientId: '', issuerURL: '' } } =
          await getEverestConfigs();
        setConfigs({
          oidc: {
            authority: oidcConfig.issuerURL,
            clientId: oidcConfig.clientId,
            redirectUri: `${window.location.protocol}//${window.location.host}/`,
          },
        });
      } catch (error) {
        setConfigs(null);
      }
    };

    loadConfigs();
  }, []);

  if (configs === undefined) {
    return <LoadingPageSkeleton />;
  }

  return (
    <ThemeContextProvider
      themeOptions={everestThemeOptions}
      saveColorModeOnLocalStorage
    >
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <SnackbarProvider
          maxSnack={3}
          preventDuplicate
          // NOTE: using custom components disables notistack's custom actions, as per docs: https://notistack.com/features/basic#actions
          // If we need actions, we can add them to our custom component via useSnackbar(): https://notistack.com/features/customization#custom-component
          Components={{
            success: NotistackMuiSnackbar,
            error: NotistackMuiSnackbar,
            info: NotistackMuiSnackbar,
            warning: NotistackMuiSnackbar,
          }}
        >
          <QueryClientProvider client={queryClient}>
            <AuthProvider
              oidcConfig={{
                ...configs?.oidc,
                redirectUri: `${window.location.protocol}//${window.location.host}/login-callback`,
                scope: 'openid profile email',
                responseType: 'code',
                autoSignIn: false,
                automaticSilentRenew: false,
              }}
            >
              <DrawerContextProvider>
                <RouterProvider router={router} />
              </DrawerContextProvider>
              <ReactQueryDevtools initialIsOpen={false} />
            </AuthProvider>
          </QueryClientProvider>
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeContextProvider>
  );
};

export default App;
