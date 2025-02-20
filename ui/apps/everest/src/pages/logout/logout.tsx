import { AuthContext } from 'contexts/auth';
import { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const Logout = () => {
  const { logout, authStatus } = useContext(AuthContext);

  useEffect(() => {
    if (authStatus === 'loggedIn') {
      logout();
    }
  }, [authStatus, logout]);

  return authStatus === 'loggedOut' ? <Navigate to="/login" replace /> : <></>;
};

export default Logout;
