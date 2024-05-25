import { Add, Delete, Edit } from '@mui/icons-material';
import { Button, MenuItem } from '@mui/material';
import { Table } from '@percona/ui-lib';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import {
  MONITORING_INSTANCES_QUERY_KEY,
  useCreateMonitoringInstance,
  useDeleteMonitoringInstance,
  useMonitoringInstancesList,
  useUpdateMonitoringInstance,
} from 'hooks/api/monitoring/useMonitoringInstancesList';
import { MRT_ColumnDef } from 'material-react-table';
import { useMemo, useState } from 'react';
import { MonitoringInstance } from 'shared-types/monitoring.types';
import {
  updateDataAfterCreate,
  updateDataAfterDelete,
  updateDataAfterEdit,
} from 'utils/generalOptimisticDataUpdate';
import { StorageLocationsFields } from '../storage-locations/storage-locations.types';
import { CreateEditEndpointModal } from './createEditModal/create-edit-modal';
import { EndpointFormType } from './createEditModal/create-edit-modal.types';
import { Messages } from './monitoring-endpoints.messages';

export const MonitoringEndpoints = () => {
  const [openCreateEditModal, setOpenCreateEditModal] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] =
    useState<MonitoringInstance>();
  const {
    data: monitoringInstances = [],
    isFetching: loadingMonitoringEndpoint,
  } = useMonitoringInstancesList();

  const { mutate: createMonitoringInstance, isPending: creatingInstance } =
    useCreateMonitoringInstance();
  const { mutate: deleteMonitoringInstance, isPending: removingInstance } =
    useDeleteMonitoringInstance();
  const { mutate: updateMonitoringInstance, isPending: updatingInstance } =
    useUpdateMonitoringInstance();
  const queryClient = useQueryClient();
  const columns = useMemo<MRT_ColumnDef<MonitoringInstance>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
      },
      {
        accessorKey: 'url',
        header: 'Endpoint',
      },
      {
        accessorKey: StorageLocationsFields.namespaces,
        header: Messages.namespaces,
        Cell: ({ cell }) => {
          const val = cell.getValue<string[]>();
          if (val) {
            return val.join(', ');
          } else {
            return '-';
          }
        },
      },
    ],
    []
  );

  const handleOpenCreateModal = () => {
    setOpenCreateEditModal(true);
  };

  const handleOpenEditModal = (instance: MonitoringInstance) => {
    setSelectedInstance(instance);
    setOpenCreateEditModal(true);
  };

  const handleCloseModal = () => {
    setSelectedInstance(undefined);
    setOpenCreateEditModal(false);
  };

  const handleCloseDeleteDialog = () => {
    setSelectedInstance(undefined);
    setOpenDeleteDialog(false);
  };

  const handleDeleteInstance = (instance: MonitoringInstance) => {
    setSelectedInstance(instance);
    setOpenDeleteDialog(true);
  };

  const handleSubmitModal = (
    isEditMode: boolean,
    { name, url, allowedNamespaces, verifyTLS, ...pmmData }: EndpointFormType
  ) => {
    if (isEditMode) {
      updateMonitoringInstance(
        {
          instanceName: name,
          payload: {
            url,
            type: 'pmm',
            allowedNamespaces,
            verifyTLS,
            pmm: { ...pmmData },
          },
        },
        {
          onSuccess: (updatedInstance) => {
            updateDataAfterEdit(
              queryClient,
              MONITORING_INSTANCES_QUERY_KEY,
              'name'
            )(updatedInstance);
            handleCloseModal();
          },
        }
      );
    } else {
      createMonitoringInstance(
        {
          name,
          url,
          type: 'pmm',
          allowedNamespaces,
          verifyTLS,
          pmm: { ...pmmData },
        },
        {
          onSuccess: (newInstance) => {
            updateDataAfterCreate(queryClient, [
              MONITORING_INSTANCES_QUERY_KEY,
            ])(newInstance);
            handleCloseModal();
          },
        }
      );
    }
  };

  const handleConfirmDelete = (instanceName: string) => {
    deleteMonitoringInstance(instanceName, {
      onSuccess: (_, locationName) => {
        updateDataAfterDelete(
          queryClient,
          MONITORING_INSTANCES_QUERY_KEY,
          'name'
        )(_, locationName);
        handleCloseDeleteDialog();
      },
    });
  };

  return (
    <>
      <Table
        tableName="monitoringEndpoints"
        hideExpandAllIcon
        data={monitoringInstances}
        columns={columns}
        state={{
          isLoading: loadingMonitoringEndpoint,
        }}
        enableRowActions
        noDataMessage="No monitoring endpoint added"
        renderTopToolbarCustomActions={() => (
          <Button
            size="small"
            startIcon={<Add />}
            data-testid="add-monitoring-endpoint"
            variant="outlined"
            onClick={handleOpenCreateModal}
          >
            {Messages.add}
          </Button>
        )}
        renderRowActionMenuItems={({ row, closeMenu }) => [
          <MenuItem
            key={0}
            onClick={() => {
              handleOpenEditModal(row.original);
              closeMenu();
            }}
            sx={{ m: 0, display: 'flex', gap: 1, px: 2, py: '10px' }}
          >
            <Edit /> {Messages.edit}
          </MenuItem>,
          <MenuItem
            key={1}
            onClick={() => {
              handleDeleteInstance(row.original);
              closeMenu();
            }}
          >
            <Delete /> {Messages.delete}
          </MenuItem>,
        ]}
      />
      {openCreateEditModal && (
        <CreateEditEndpointModal
          open={openCreateEditModal}
          handleClose={handleCloseModal}
          handleSubmit={handleSubmitModal}
          isLoading={creatingInstance || updatingInstance}
          selectedEndpoint={selectedInstance}
        />
      )}
      {openDeleteDialog && (
        <ConfirmDialog
          isOpen={openDeleteDialog}
          selectedId={selectedInstance?.name || ''}
          closeModal={handleCloseDeleteDialog}
          headerMessage={Messages.deleteDialogHeader}
          handleConfirm={handleConfirmDelete}
          disabledButtons={removingInstance}
        >
          {Messages.deleteConfirmation(selectedInstance!.name)}
        </ConfirmDialog>
      )}
    </>
  );
};
