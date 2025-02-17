import { useContext, useEffect, useRef, useState } from 'react';
import UpgradeEverestContext from './upgrade-everest.context';
import { useVersion } from 'hooks';
import { AuthContext } from 'contexts/auth';
import { useAuth } from 'oidc-react';

const UpgradeEverestProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const commitVersion = useRef<null | string>(null);
  const { authStatus, isSsoEnabled } = useContext(AuthContext);
  const { isLoading } = useAuth();
  const { data: apiVersion } = useVersion({
    enabled: authStatus === 'loggedIn' || (isSsoEnabled && isLoading),
  });
  58;
  const [currentVersion, setCurrentVersion] = useState('');

  const [openReloadEverestDialog, setOpenReloadEverestDialog] = useState(false);

  useEffect(() => {
    if (commitVersion.current === null && apiVersion?.fullCommit) {
      commitVersion.current = apiVersion?.fullCommit;
      setCurrentVersion(apiVersion?.version);
    }
    if (
      commitVersion.current !== null &&
      commitVersion.current !== apiVersion?.fullCommit
    ) {
      setOpenReloadEverestDialog(true);
    }
  }, [apiVersion?.fullCommit, apiVersion?.version]);

  const toggleOpenReloadDialog = () =>
    setOpenReloadEverestDialog((val) => !val);

  return (
    <UpgradeEverestContext.Provider
      value={{
        openReloadDialog: openReloadEverestDialog,
        toggleOpenReloadDialog,
        setOpenReloadDialog: setOpenReloadEverestDialog,
        currentVersion: currentVersion,
        apiVersion: apiVersion?.version,
      }}
    >
      {children}
    </UpgradeEverestContext.Provider>
  );
};

export default UpgradeEverestProvider;
