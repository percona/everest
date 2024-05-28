import { api, addApiInterceptors, removeApiInterceptors } from 'api/api';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { enqueueSnackbar } from 'notistack';
import AuthContext from './auth.context';
import { UserAuthStatus } from './auth.context.types';
import { jwtDecode } from 'jwt-decode';
import { useRBACPolicies } from 'hooks/api/policies/usePolicies';
import { Authorizer } from 'casbin.js';

const setApiBearerToken = (token: string) =>
  (api.defaults.headers.common['Authorization'] = `Bearer ${token}`);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authStatus, setAuthStatus] = useState<UserAuthStatus>('unknown');
  const [redirect, setRedirect] = useState<string | null>(null);
  const { data: policies = '' } = useRBACPolicies();
  const [username, setUsername] = useState('');

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/session', { username, password });
      setUsername(username);
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

      const decoded = jwtDecode(savedToken);
      // TODO: remove indexOf when API removes the colon
      const username = decoded.sub?.substring(0, decoded.sub.indexOf(':'));
      setUsername(username || '');
    } else {
      setAuthStatus('loggedOut');
    }
  }, []);

  const authorize = useCallback(
    async (action: string, resource: string, specificResource?: string) => {
      const authorizer = new Authorizer('auto', { endpoint: '/' });
      authorizer.user = username;
      await authorizer.initEnforcer(JSON.stringify(policies));
      return (await authorizer).can(specificResource || '*', action, resource);
    },
    [username, policies]
  );

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        authStatus,
        redirectRoute: redirect,
        setRedirectRoute,
        authorize,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
