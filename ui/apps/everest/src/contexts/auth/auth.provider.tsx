import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AuthProvider as OidcAuthProvider,
  AuthProviderProps as OidcAuthProviderProps,
  useAuth as useOidcAuth,
} from 'oidc-react';
import { AxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Authorizer } from 'casbin.js';
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
import { useRBACPolicies } from 'hooks/api/policies/usePolicies';

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

  const { data: policies, refetch: refetchRBAC } = useRBACPolicies();
  const [username, setUsername] = useState('');

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
      await refetchRBAC();
    } else {
      const { username, password } = manualAuthArgs!;
      setUsername(username);
      try {
        const response = await api.post('/session', { username, password });
        const token = response.data.token; // Assuming the response structure has a token field
        localStorage.setItem('everestToken', token);
        await refetchRBAC();
        setLoggedInStatus();
      } catch (error) {
        if (error instanceof AxiosError) {
          const errorStatus = error.response?.status;
          let errorMsg = 'Something went wrong';

          if (errorStatus === 401) {
            errorMsg = 'Invalid credentials';
          } else if (errorStatus === 429) {
            errorMsg =
              "Looks like you've made too many attempts. Try again later.";
          }
          enqueueSnackbar(errorMsg, {
            variant: 'error',
          });
        }
        setLogoutStatus();
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
      const decoded = jwtDecode(token);
      const iss = decoded.iss;
      const exp = decoded.exp;
      const username = decoded.sub?.substring(0, decoded.sub.indexOf(':'));
      setUsername(username || '');
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

  const can = useCallback(
    async (action: string, resource: string, specificResource: string) => {
      const authorizer = new Authorizer('auto', { endpoint: '/' });
      authorizer.user = username;
      await authorizer.initEnforcer(JSON.stringify(policies));
      // Params are inverted because of the way our policies are defined: "sub, res, act, obj" instead of "sub, obj, act"
      return await authorizer.can(specificResource, action, resource);
    },
    [policies, username]
  );

  const cannot = useCallback(
    async (action: string, resource: string, specificResource: string) => {
      return !(await can(action, resource, specificResource));
    },
    [can]
  );

  const canAll = useCallback(
    async (action: string, resource: string, specificResource: string[]) => {
      for (let i = 0; i < specificResource.length; ++i) {
        if (await cannot(action, resource, specificResource[i])) {
          return false;
        }
      }
      return true;
    },
    [cannot]
  );

  const authorize = useCallback(
    async (
      action: string,
      resource: string,
      specificResource: string | string[] = '*'
    ) => {
      return await (Array.isArray(specificResource)
        ? canAll(action, resource, specificResource)
        : can(action, resource, specificResource));
    },
    [can, canAll]
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
        isSsoEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default Provider;
