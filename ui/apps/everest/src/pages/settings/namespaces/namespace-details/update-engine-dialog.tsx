import { useUpdateDbClusterWithConflictRetry } from 'hooks';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import { DbCluster } from 'shared-types/dbCluster.types';
import { Messages } from './messages';
import { changeDbClusterEngine } from 'utils/db';
import { useLocation } from 'react-router-dom';

const UpdateEngineDialog = ({
  dbCluster,
  newVersion,
  onClose,
}: {
  dbCluster: DbCluster;
  onClose: () => void;
  newVersion: string;
}) => {
  const location = useLocation();
  const cluster = location.state?.cluster || 'in-cluster';
  const { mutate: updateCluster } = useUpdateDbClusterWithConflictRetry(
    dbCluster,
    cluster,
    {
      onSuccess: () => onClose(),
    }
  );

  const onEngineUpdate = async () => {
    updateCluster(changeDbClusterEngine(dbCluster, newVersion));
  };

  return (
    <ConfirmDialog
      open
      cancelMessage="Cancel"
      selectedId={dbCluster.metadata.name}
      closeModal={onClose}
      handleConfirm={onEngineUpdate}
      headerMessage="Upgrade Engine Version"
      submitMessage="Upgrade"
    >
      {Messages.upgradeEngineVersion(dbCluster.metadata.name, newVersion)}
    </ConfirmDialog>
  );
};

export default UpdateEngineDialog;
