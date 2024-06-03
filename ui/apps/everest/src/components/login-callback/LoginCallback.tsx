import { useEffect } from 'react';
import { useAuth } from 'oidc-react';

const LoginCallback = () => {
  const { userManager } = useAuth();
  useEffect(() => {
    const processLogin = async () => {
      const user = await userManager.signinRedirectCallback('/');

      if (user) {
        localStorage.setItem('everestToken', user.access_token);
        window.location.href = '/';
      }
    };
    processLogin();
  }, [userManager]);

  return null;
};

export default LoginCallback;
