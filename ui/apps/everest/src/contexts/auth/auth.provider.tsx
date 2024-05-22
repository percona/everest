import { useEffect, useState } from 'react';
import {
  AuthProvider as OidcAuthProvider,
  AuthProviderProps as OidcAuthProviderProps,
  useAuth as useOidcAuth,
} from 'oidc-react';
import {
  api,
  addApiErrorInterceptor,
  removeApiErrorInterceptor,
  addApiAuthInterceptor,
} from 'api/api';
import { enqueueSnackbar } from 'notistack';
import AuthContext from './auth.context';
import {
  AuthMode,
  AuthProviderProps,
  ManualAuthArgs,
  UserAuthStatus,
} from './auth.context.types';

const Provider = ({
  oidcConfig,
  children,
}: {
  oidcConfig?: OidcAuthProviderProps;
  children: React.ReactNode;
}) => (
  <OidcAuthProvider {...oidcConfig}>
    <AuthProvider isSsoEnabled={!!oidcConfig}>{children}</AuthProvider>
  </OidcAuthProvider>
);

const AuthProvider = ({ children, isSsoEnabled }: AuthProviderProps) => {
  const [authStatus, setAuthStatus] = useState<UserAuthStatus>('unknown');
  const [redirect, setRedirect] = useState<string | null>(null);
  const {
    signOut,
    signIn,
    userData,
    isLoading: loadingOidcAuth,
  } = useOidcAuth();

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
      await signOut();
    }

    setAuthStatus('loggedOut');
    localStorage.removeItem('everestToken');
    setRedirect(null);
    removeApiErrorInterceptor();
  };

  const setRedirectRoute = (route: string) => {
    setRedirect(route);
  };

  useEffect(() => {
    if (loadingOidcAuth) {
      setAuthStatus('loggingIn');
      return;
    }
    if (userData) {
      localStorage.setItem('everestToken', userData.access_token);
    }
    const savedToken = localStorage.getItem('everestToken');
    if (savedToken) {
      setAuthStatus('loggedIn');
      addApiErrorInterceptor();
      addApiAuthInterceptor();
    } else {
      setAuthStatus('loggedOut');
    }
  }, [loadingOidcAuth, userData]);

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
