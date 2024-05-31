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
    () => <AuthProvider isSsoEnabled={!!oidcConfig}>{children}</AuthProvider>,
    [children, oidcConfig]
  );
  return <OidcAuthProvider {...oidcConfig}>{authProvider}</OidcAuthProvider>;
};

const AuthProvider = ({ children, isSsoEnabled }: AuthProviderProps) => {
  const [authStatus, setAuthStatus] = useState<UserAuthStatus>('unknown');
  const [redirect, setRedirect] = useState<string | null>(null);
  const { signIn, userData, userManager, isLoading } = useOidcAuth();
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
    if (mode === 'sso') {
      await signIn();
    } else {
      const { username, password } = manualAuthArgs!;
      try {
        const response = await api.post('/session', { username, password });
        const token = response.data.token; // Assuming the response structure has a token field
        setAuthStatus('loggedIn');
        localStorage.setItem('everestToken', token);
        addApiErrorInterceptor();
      } catch (error) {
        setAuthStatus('loggedOut');
        enqueueSnackbar('Invalid credentials', {
          variant: 'error',
        });
        return;
      }
    }
  };

  const logout = async () => {
    if (isSsoEnabled) {
      userManager.clearStaleState();
      await setLogoutStatus();
    }

    setAuthStatus('loggedOut');
    localStorage.removeItem('everestToken');
    setRedirect(null);
    removeApiErrorInterceptor();
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
    await userManager.clearStaleState();
    await userManager.removeUser();
  }, [userManager]);

  useEffect(() => {
    userManager.events.addUserLoaded((user) => {
      localStorage.setItem('everestToken', user.access_token || '');
    });
  }, []);

  useEffect(() => {
    if (authStatus !== 'loggedIn' && userData && userData.access_token) {
      localStorage.setItem('everestToken', userData.access_token);
      setLoggedInStatus();
    }
  }, [userData, isLoading, authStatus]);

  useEffect(() => {
    if (authStatus === 'loggedIn') {
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
      } else if (isAfter(new Date(), new Date((exp || 0) * 1000))) {
        const user = await userManager.signinSilent();

        if (user && user.access_token) {
          localStorage.setItem('everestToken', user.access_token);
        } else {
          setLogoutStatus();
        }
      }
    };
    const savedToken = localStorage.getItem('everestToken');

    if (!savedToken) {
      setLogoutStatus();
      return;
    }

    authRoutine(savedToken);
  }, [authStatus]);

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
