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
import { DB_CLUSTER_QUERY } from './useDbCluster';

export const useDbActions = (dbCluster: DbCluster) => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openRestoreDialog, setOpenRestoreDialog] = useState(false);
  const deleteMutation = useDeleteDbCluster(dbCluster.metadata.name);
  const { mutate: deleteDbCluster } = deleteMutation;
  const { mutate: suspendDbCluster } = usePausedDbCluster();
  const { mutate: restartDbCluster } = useRestartDbCluster();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isPaused = (dbCluster: DbCluster) => dbCluster.spec.paused;

  const handleDbSuspendOrResumed = (dbCluster: DbCluster) => {
    const shouldBePaused = !isPaused(dbCluster);

    suspendDbCluster(
      { shouldBePaused, dbCluster },
      {
        onSuccess: (data) => {
          const updatedObject = data as DbCluster;
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
    restartDbCluster(
      { dbCluster },
      {
        onSuccess: (data) => {
          const updatedObject = data as DbCluster;
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

  const handleDeleteDbCluster = () => {
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
        dbClusterName: dbCluster.metadata.name,
        namespace: dbCluster.metadata.namespace,
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
                items: oldData.items.map((item) => {
                  if (item.metadata.name === variables.dbClusterName) {
                    return {
                      ...item,
                      status: {
                        ...item.status,
                        crVersion: item.status?.crVersion || '',
                        hostname: item.status?.hostname || '',
                        port: item.status?.port || 0,
                        status: DbClusterStatus.deleting,
                      },
                    };
                  }

                  return item;
                }),
              };
            }
          );
          queryClient.setQueryData<DbCluster>(
            [DB_CLUSTER_QUERY, dbCluster.metadata.name],
            (oldData) => {
              if (!oldData) {
                return undefined;
              }

              return {
                ...oldData,
                status: {
                  ...oldData.status,
                  hostname: oldData.status?.hostname || '',
                  port: oldData.status?.port || 0,
                  crVersion: oldData.status?.crVersion || '',
                  status: DbClusterStatus.deleting,
                },
              };
            }
          );
          handleCloseDeleteDialog(redirect);
        },
      }
    );
  };

  const handleRestoreDbCluster = () => {
    setOpenRestoreDialog(true);
  };

  const handleOpenDbDetailsDialog = () => {
    setOpenDetailsDialog(true);
  };

  const handleCloseRestoreDialog = () => {
    setOpenRestoreDialog(false);
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
  };

  return {
    openDeleteDialog,
    openRestoreDialog,
    openDetailsDialog,
    handleDbSuspendOrResumed,
    handleDbRestart,
    handleDeleteDbCluster,
    handleConfirmDelete,
    handleOpenDbDetailsDialog,
    handleCloseDeleteDialog,
    handleCloseDetailsDialog,
    isPaused,
    handleRestoreDbCluster,
    handleCloseRestoreDialog,
    setOpenDetailsDialog,
    deleteMutation,
  };
};
