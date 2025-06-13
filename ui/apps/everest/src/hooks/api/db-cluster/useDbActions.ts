import { useDeleteDbCluster } from 'hooks/api/db-cluster/useDeleteDbCluster';
import { DbCluster } from 'shared-types/dbCluster.types';
import { useCallback, useState } from 'react';
import { useUpdateDbClusterWithConflictRetry } from './useUpdateDbCluster';
import { setDbClusterPausedStatus } from 'utils/db';
import { useNavigate } from 'react-router-dom';

export const useDbActions = (dbCluster: DbCluster, cluster: string) => {
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const navigate = useNavigate();

  const handleCloseRestoreDialog = () => {
    setOpenRestoreDialog(false);
  };

  const handleCloseDeleteDialog = (redirect?: string) => {
    setOpenDeleteDialog(false);
    if (redirect) {
      navigate(redirect);
    }
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
  };

  const deleteMutation = useDeleteDbCluster(cluster);

  const { mutate: updateCluster } = useUpdateDbClusterWithConflictRetry(
    dbCluster,
    cluster
  );

  const handleDbRestart = useCallback(
    (dbCluster: DbCluster) => {
      updateCluster({
        ...dbCluster,
        metadata: {
          ...dbCluster.metadata,
          annotations: {
            ...dbCluster.metadata.annotations,
            'everest.percona.com/restart': new Date().toISOString(),
          },
        },
      });
    },
    [updateCluster]
  );

  const handleDbSuspendOrResumed = useCallback(
    (dbCluster: DbCluster) => {
      const shouldBePaused = !isPaused(dbCluster);
      updateCluster(setDbClusterPausedStatus(dbCluster, shouldBePaused));
    },
    [updateCluster]
  );

  const handleDeleteDbCluster = () => {
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = (cleanupBackupStorage: boolean) => {
    deleteMutation.mutate({
      dbClusterName: dbCluster.metadata.name,
      namespace: dbCluster.metadata.namespace,
      cleanupBackupStorage,
    });
    handleCloseDeleteDialog();
  };

  const handleRestoreDbCluster = () => {
    setOpenRestoreDialog(true);
  };

  const handleOpenDbDetailsDialog = () => {
    setOpenDetailsDialog(true);
  };

  const isPaused = (dbCluster: DbCluster) =>
    dbCluster.spec.paused === true;

  return {
    openRestoreDialog,
    handleCloseRestoreDialog,
    handleDbRestart,
    handleDeleteDbCluster,
    isPaused,
    openDeleteDialog,
    handleConfirmDelete,
    handleCloseDeleteDialog,
    openDetailsDialog,
    handleOpenDbDetailsDialog,
    handleCloseDetailsDialog,
    handleDbSuspendOrResumed,
    handleRestoreDbCluster,
    deleteMutation,
  };
};
