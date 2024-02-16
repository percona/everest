import { addApiInterceptors, api, removeApiInterceptors } from 'api/api';
import { useVersion } from 'hooks/api/version/useVersion';
import { ReactNode, useEffect, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import AuthContext from './auth.context';
import { UserAuthStatus } from './auth.context.types';

const setApiBearerToken = (token: string) =>
  (api.defaults.headers.common['Authorization'] = `Bearer ${token}`);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authStatus, _setAuthStatus] = useState<UserAuthStatus>('unknown');
  const [apiCallEnabled, setApiCallEnabled] = useState(false);
  const [token, setToken] = useState('');
  const [redirect, setRedirect] = useState<string | null>(null);

  const login = (token: string) => {
    _setAuthStatus('loggingIn');
    setApiBearerToken(token);
    setToken(token);
    // This will trigger the API call to "/version"
    setApiCallEnabled(true);
  };

  const logout = () => {
    localStorage.removeItem('pwd');
    setApiBearerToken('');
    setRedirect(null);
    _setAuthStatus('loggedOut');
    removeApiInterceptors();
  };

  const setAuthStatus = (newStatus: UserAuthStatus) =>
    _setAuthStatus(newStatus);

  const setRedirectRoute = (route: string) => {
    setRedirect(route);
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('pwd');

    if (savedToken) {
      login(savedToken);
    } else {
      _setAuthStatus('loggedOut');
    }
  }, []);

  // We use the "/version" API call just to make sure the token works
  // At this point, there's not really a login flow, per se
  useVersion({
    enabled: apiCallEnabled,
    retry: false,
    onSuccess: () => {
      setApiCallEnabled(false);
      _setAuthStatus('loggedIn');
      setApiBearerToken(token);
      localStorage.setItem('pwd', token);
      addApiInterceptors();
    },
    onError: () => {
      _setAuthStatus('loggedOut');
      setApiCallEnabled(false);

      // This means the request was triggered by clicking the button, not an auto login
      if (!localStorage.getItem('pwd')) {
        enqueueSnackbar('Invalid authorization token', {
          variant: 'error',
        });
      }
      localStorage.removeItem('pwd');
    },
  });

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        authStatus,
        setAuthStatus,
        redirectRoute: redirect,
        setRedirectRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
