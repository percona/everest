export type UserAuthStatus =
  | 'loggingIn'
  | 'loggingOut'
  | 'loggedIn'
  | 'loggedOut'
  | 'unknown';

export interface AuthContextProps {
  login: (token: string) => void;
  logout: () => void;
  setRedirectRoute: (route: string) => void;
  authStatus: UserAuthStatus;
  redirectRoute: string | null;
}
