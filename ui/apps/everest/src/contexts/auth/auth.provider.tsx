import { useEffect, useState } from 'react';
import {
  AuthProvider as OidcAuthProvider,
  AuthProviderProps as OidcAuthProviderProps,
} from 'oidc-react';
import { api, addApiInterceptors, removeApiInterceptors } from 'api/api';
import { enqueueSnackbar } from 'notistack';
import AuthContext from './auth.context';
import { AuthProviderProps, UserAuthStatus } from './auth.context.types';

const setApiBearerToken = (token: string) =>
  (api.defaults.headers.common['Authorization'] = `Bearer ${token}`);

const Provider = ({
  oidcConfig,
  children,
}: {
  oidcConfig: OidcAuthProviderProps;
  children: React.ReactNode;
}) => (
  <OidcAuthProvider {...oidcConfig}>
    <AuthProvider isSsoEnabled={!!oidcConfig}>{children}</AuthProvider>
  </OidcAuthProvider>
);

const AuthProvider = ({ children, isSsoEnabled }: AuthProviderProps) => {
  const [authStatus, setAuthStatus] = useState<UserAuthStatus>('unknown');
  const [redirect, setRedirect] = useState<string | null>(null);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/session', { username, password });
      const token = response.data.token; // Assuming the response structure has a token field
      setAuthStatus('loggedIn');
      setApiBearerToken(token);
      localStorage.setItem('pwd', token);
      addApiInterceptors();
    } catch (error) {
      setAuthStatus('loggedOut');
      enqueueSnackbar('Invalid credentials', {
        variant: 'error',
      });
    }
  };

  const logout = () => {
    setAuthStatus('loggedOut');
    setApiBearerToken('');
    localStorage.removeItem('pwd');
    setRedirect(null);
    removeApiInterceptors();
  };

  const setRedirectRoute = (route: string) => {
    setRedirect(route);
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('pwd');
    if (savedToken) {
      setAuthStatus('loggedIn');
      setApiBearerToken(savedToken);
      addApiInterceptors();
    } else {
      setAuthStatus('loggedOut');
    }
  }, []);

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
      <OidcAuthProvider>{children}</OidcAuthProvider>
    </AuthContext.Provider>
  );
};

export default Provider;
