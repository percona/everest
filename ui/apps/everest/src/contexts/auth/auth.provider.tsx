import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AuthProvider as OidcAuthProvider,
  AuthProviderProps as OidcAuthProviderProps,
  useAuth as useOidcAuth,
} from 'oidc-react';
import { jwtDecode } from 'jwt-decode';
import {
  api,
  addApiErrorInterceptor,
  removeApiErrorInterceptor,
  addApiAuthInterceptor,
  removeApiAuthInterceptor,
} from 'api/api';
import { enqueueSnackbar } from 'notistack';
import AuthContext from './auth.context';
import { EVEREST_JWT_ISSUER } from 'consts';
import {
  AuthMode,
  AuthProviderProps,
  ManualAuthArgs,
  UserAuthStatus,
} from './auth.context.types';
import { isAfter } from 'date-fns';

const Provider = ({
  oidcConfig,
  children,
}: {
  oidcConfig?: OidcAuthProviderProps;
  children: React.ReactNode;
}) => {
  const authProvider = useMemo(
    () => (
      <AuthProvider
        isSsoEnabled={!!oidcConfig?.authority && !!oidcConfig?.clientId}
      >
        {children}
      </AuthProvider>
    ),
    [children, oidcConfig]
  );
  return <OidcAuthProvider {...oidcConfig}>{authProvider}</OidcAuthProvider>;
};

const AuthProvider = ({ children, isSsoEnabled }: AuthProviderProps) => {
  const [authStatus, setAuthStatus] = useState<UserAuthStatus>('unknown');
  const [redirect, setRedirect] = useState<string | null>(null);
  const { signIn, userManager } = useOidcAuth();
  const checkAuth = useCallback(async (token: string) => {
    try {
      await api.get('/version', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const login = async (mode: AuthMode, manualAuthArgs?: ManualAuthArgs) => {
    setAuthStatus('loggingIn');
    if (mode === 'sso') {
      await signIn();
    } else {
      const { username, password } = manualAuthArgs!;
      try {
        const response = await api.post('/session', { username, password });
        const token = response.data.token; // Assuming the response structure has a token field
        localStorage.setItem('everestToken', token);
        setLoggedInStatus();
      } catch (error) {
        setLogoutStatus();
        enqueueSnackbar('Invalid credentials', {
          variant: 'error',
        });
        return;
      }
    }
  };

  const logout = async () => {
    if (isSsoEnabled) {
      await userManager.clearStaleState();
      await setLogoutStatus();
    }

    setAuthStatus('loggedOut');
    localStorage.removeItem('everestToken');
    setRedirect(null);
    removeApiErrorInterceptor();
    removeApiAuthInterceptor();
  };

  const setRedirectRoute = (route: string) => {
    setRedirect(route);
  };

  const setLoggedInStatus = () => {
    setAuthStatus('loggedIn');
    addApiErrorInterceptor();
    addApiAuthInterceptor();
  };

  const setLogoutStatus = useCallback(async () => {
    setAuthStatus('loggedOut');
    localStorage.removeItem('everestToken');
    if (isSsoEnabled) {
      await userManager.clearStaleState();
      await userManager.removeUser();
    }
  }, [userManager]);

  const silentlyRenewToken = useCallback(async () => {
    const newLoggedUser = await userManager.signinSilent();

    if (newLoggedUser && newLoggedUser.access_token) {
      localStorage.setItem('everestToken', newLoggedUser.access_token);
    } else {
      setLogoutStatus();
    }
  }, [userManager]);

  useEffect(() => {
    if (isSsoEnabled) {
      userManager.events.addUserLoaded((user) => {
        localStorage.setItem('everestToken', user.access_token || '');
        setLoggedInStatus();
      });

      userManager.events.addAccessTokenExpiring(() => {
        silentlyRenewToken();
      });

      userManager.signinSilentCallback();
    }
  }, [isSsoEnabled, silentlyRenewToken, userManager]);

  useEffect(() => {
    if (window.location !== window.parent.location) {
      // This is running in the iframe, so we are renewing the token silently
      return;
    }

    if (authStatus === 'loggedIn' || authStatus === 'loggingIn') {
      return;
    }

    const authRoutine = async (token: string) => {
      const { iss, exp } = jwtDecode(token);
      if (iss === EVEREST_JWT_ISSUER) {
        const isTokenValid = await checkAuth(token);
        if (isTokenValid) {
          setLoggedInStatus();
        } else {
          setLogoutStatus();
        }
      } else {
        if (isAfter(new Date(), new Date((exp || 0) * 1000))) {
          silentlyRenewToken();
          return;
        }

        const user = await userManager.getUser();

        if (!user) {
          setLogoutStatus();
        } else {
          setLoggedInStatus();
          return;
        }
      }
    };
    const savedToken = localStorage.getItem('everestToken');

    if (!savedToken) {
      setLogoutStatus();
      return;
    }

    authRoutine(savedToken);
  }, [authStatus, silentlyRenewToken, userManager]);

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        authStatus,
        redirectRoute: redirect,
        setRedirectRoute,
        isSsoEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default Provider;
