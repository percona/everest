import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ThemeContextProvider, everestThemeOptions } from '@percona/design';
import { NotistackMuiSnackbar } from '@percona/ui-lib';
import { SnackbarProvider } from 'notistack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from 'contexts/auth';
import { DrawerContextProvider } from 'contexts/drawer/drawer.context';
import router from 'router';
import { addApiAuthInterceptor, removeApiAuthInterceptor } from 'api/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
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
              authority: 'https://id-dev.percona.com/oauth2/default',
              clientId: '0oaes7mtfpYjxn2d81d7',
              scope: 'openid profile email',
              responseType: 'code',
              redirectUri: 'http://localhost:3000/login/callback',
              onSignIn: (user) => {
                localStorage.setItem('everestToken', user?.access_token || '');
                addApiAuthInterceptor();
              },
              onSignOut: () => {
                removeApiAuthInterceptor();
              },
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

export default App;
