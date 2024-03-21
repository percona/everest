import { addApiInterceptors, api, removeApiInterceptors } from 'api/api';
import { useVersion } from 'hooks/api/version/useVersion';
import { ReactNode, useEffect, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import AuthContext from './auth.context';
import { UserAuthStatus } from './auth.context.types';

const setApiBearerToken = (token: string) =>
  (api.defaults.headers.common['Authorization'] = `Bearer ${token}`);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authStatus, setAuthStatus] = useState<UserAuthStatus>('unknown');
  const [token, setToken] = useState('');
  const [redirect, setRedirect] = useState<string | null>(null);

  // We use the "/version" API call just to make sure the token works
  // At this point, there's not really a login flow, per se
  const {
    status: queryStatus,
    fetchStatus,
    refetch,
  } = useVersion({
    enabled: false,
    retry: false,
  });

  const login = (token: string) => {
    setAuthStatus('loggingIn');
    setApiBearerToken(token);
    setToken(token);
    refetch();
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
      login(savedToken);
    } else {
      setAuthStatus('loggedOut');
    }
  }, []);

  useEffect(() => {
    if (fetchStatus === 'fetching') return;
    if (queryStatus === 'success') {
      setAuthStatus('loggedIn');
      localStorage.setItem('pwd', token);
      addApiInterceptors();
    } else if (queryStatus === 'error') {
      setAuthStatus('loggedOut');
      // This means the request was triggered by clicking the button, not an auto login
      if (!localStorage.getItem('pwd')) {
        enqueueSnackbar('Invalid authorization token', {
          variant: 'error',
        });
      }
      localStorage.removeItem('pwd');
    }
  }, [fetchStatus, queryStatus, token]);

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        authStatus,
        redirectRoute: redirect,
        setRedirectRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
