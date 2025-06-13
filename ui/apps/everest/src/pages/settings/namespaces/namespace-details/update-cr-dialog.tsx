import { useUpdateDbClusterWithConflictRetry } from 'hooks/api/db-cluster/useUpdateDbCluster';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import { DbCluster } from 'shared-types/dbCluster.types';
import { Messages } from './messages';
import { changeDbClusterCrd } from 'utils/db';
import { useLocation } from 'react-router-dom';

const UpdateCrDialog = ({
  dbCluster,
  onClose,
}: {
  dbCluster: DbCluster;
  onClose: () => void;
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

  const onCrdUpdate = async () => {
    updateCluster(
      changeDbClusterCrd(
        dbCluster,
        dbCluster.status?.recommendedCRVersion || ''
      )
    );
  };

  return (
    <ConfirmDialog
      open
      cancelMessage="Cancel"
      selectedId={dbCluster.metadata.name}
      closeModal={onClose}
      handleConfirm={onCrdUpdate}
      headerMessage="Upgrade CRD Version"
      submitMessage="Upgrade"
    >
      {Messages.upgradeCRVersion(
        dbCluster.metadata.name,
        dbCluster.status?.recommendedCRVersion || ''
      )}
    </ConfirmDialog>
  );
};

export default UpdateCrDialog;
