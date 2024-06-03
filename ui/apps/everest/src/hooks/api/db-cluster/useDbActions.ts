import { useDeleteDbCluster } from 'hooks/api/db-cluster/useDeleteDbCluster';
import { usePausedDbCluster } from 'hooks/api/db-cluster/usePausedDbCluster';
import { useRestartDbCluster } from 'hooks/api/db-cluster/useRestartDbCluster';
import { DB_CLUSTERS_QUERY_KEY } from 'hooks/api/db-clusters/useDbClusters';
import { enqueueSnackbar } from 'notistack';
import { Messages } from 'pages/databases/dbClusterView.messages';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  DbCluster,
  DbClusterStatus,
  GetDbClusterPayload,
} from 'shared-types/dbCluster.types';

export const useDbActions = () => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const [selectedDbCluster, setSelectedDbCluster] = useState<DbCluster>();
  const { mutate: deleteDbCluster } = useDeleteDbCluster();
  const { mutate: suspendDbCluster } = usePausedDbCluster();
  const { mutate: restartDbCluster } = useRestartDbCluster();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isPaused = (dbCluster: DbCluster) => dbCluster.spec.paused;

  const handleDbSuspendOrResumed = (dbCluster: DbCluster) => {
    setSelectedDbCluster(dbCluster);
    const shouldBePaused = !isPaused(dbCluster);

    suspendDbCluster(
      { shouldBePaused, dbCluster },
      {
        onSuccess: (updatedObject: DbCluster) => {
          queryClient.setQueryData<GetDbClusterPayload | undefined>(
            [DB_CLUSTERS_QUERY_KEY, updatedObject.metadata.namespace],
            (oldData) => {
              if (!oldData) {
                return undefined;
              }

              return {
                ...oldData,
                items: oldData.items.map((value) =>
                  value.metadata.name === updatedObject.metadata.name
                    ? updatedObject
                    : value
                ),
              };
            }
          );
          enqueueSnackbar(
            shouldBePaused
              ? Messages.responseMessages.pause
              : Messages.responseMessages.resume,
            {
              variant: 'success',
            }
          );
        },
      }
    );
  };

  const handleDbRestart = (dbCluster: DbCluster) => {
    setSelectedDbCluster(dbCluster);
    restartDbCluster(
      { dbCluster },
      {
        onSuccess: (updatedObject: DbCluster) => {
          queryClient.setQueryData<GetDbClusterPayload | undefined>(
            [DB_CLUSTERS_QUERY_KEY, updatedObject.metadata.namespace],
            (oldData) => {
              if (!oldData) {
                return undefined;
              }

              return {
                ...oldData,
                items: oldData.items.map((value) =>
                  value.metadata.name === updatedObject.metadata.name
                    ? updatedObject
                    : value
                ),
              };
            }
          );
          enqueueSnackbar(Messages.responseMessages.restart, {
            variant: 'success',
          });
        },
      }
    );
  };

  const handleDeleteDbCluster = (dbCluster: DbCluster) => {
    setSelectedDbCluster(dbCluster);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = (redirect?: string) => {
    setOpenDeleteDialog(false);

    if (redirect) {
      navigate(redirect);
    }
  };

  const handleConfirmDelete = (
    keepBackupStorageData: boolean,
    redirect?: string
  ) => {
    deleteDbCluster(
      {
        dbClusterName: selectedDbCluster!.metadata.name,
        namespace: selectedDbCluster!.metadata.namespace,
        cleanupBackupStorage: !keepBackupStorageData,
      },
      {
        onSuccess: (_, variables) => {
          queryClient.setQueryData<GetDbClusterPayload | undefined>(
            [DB_CLUSTERS_QUERY_KEY, variables.namespace],
            (oldData) => {
              if (!oldData) {
                return undefined;
              }

              return {
                ...oldData,
                items: oldData.items.map((item) =>
                  item.metadata.name === variables.dbClusterName
                    ? {
                        ...item,
                        status: {
                          ...item.status,
                          crVersion: item.status?.crVersion || '',
                          hostname: item.status?.hostname || '',
                          port: item.status?.port || 0,
                          status: DbClusterStatus.deleting,
                        },
                      }
                    : item
                ),
              };
            }
          );
          handleCloseDeleteDialog(redirect);
        },
      }
    );
  };

  const handleRestoreDbCluster = (dbCluster: DbCluster) => {
    setSelectedDbCluster(dbCluster);
    setOpenRestoreDialog(true);
  };

  const handleCloseRestoreDialog = () => {
    setOpenRestoreDialog(false);
  };

  return {
    openDeleteDialog,
    openRestoreDialog,
    handleDbSuspendOrResumed,
    handleDbRestart,
    handleDeleteDbCluster,
    handleConfirmDelete,
    handleCloseDeleteDialog,
    isPaused,
    handleRestoreDbCluster,
    handleCloseRestoreDialog,
    selectedDbCluster,
  };
};
