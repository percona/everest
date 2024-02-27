import { createContext } from 'react';
import { AuthContextProps } from './auth.context.types';

const AuthContext = createContext<AuthContextProps>({
  login: () => {},
  logout: () => {},
  setRedirectRoute: () => {},
  authStatus: 'unknown',
  redirectRoute: null,
});

export default AuthContext;
