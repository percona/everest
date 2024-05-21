export type UserAuthStatus =
  | 'loggingIn'
  | 'loggingOut'
  | 'loggedIn'
  | 'loggedOut'
  | 'unknown';

export interface AuthContextProps {
  login: (username: string, password: string) => void;
  logout: () => void;
  setRedirectRoute: (route: string) => void;
  authStatus: UserAuthStatus;
  redirectRoute: string | null;
  isSsoEnabled: boolean;
}

export interface AuthProviderProps {
  children: React.ReactNode;
  isSsoEnabled: boolean;
}
