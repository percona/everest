import { Add, Delete, Edit } from '@mui/icons-material';
import { Button, MenuItem } from '@mui/material';
import { Table } from '@percona/ui-lib';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialogNamespace } from 'components/confirm-dialog-namespace/confirm-dialog-namespace';
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
import { CreateEditEndpointModal } from './createEditModal/create-edit-modal';
import { EndpointFormType } from './createEditModal/create-edit-modal.types';
import { Messages } from './monitoring-endpoints.messages';
import { useNamespaces } from 'hooks/api/namespaces';
import { convertMonitoringInstancesPayloadToTableFormat } from './monitoring-endpoints.utils';
import { MonitoringInstanceTableElement } from './monitoring-endpoints.types';

export const MonitoringEndpoints = () => {
  const [openCreateEditModal, setOpenCreateEditModal] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] =
    useState<MonitoringInstance>();
  const { data: namespaces = [] } = useNamespaces();
  const monitoringInstances = useMonitoringInstancesList(namespaces);

  const monitoringInstancesLoading = monitoringInstances.some(
    (result) => result.queryResult.isLoading
  );

  const tableData = useMemo(
    () => convertMonitoringInstancesPayloadToTableFormat(monitoringInstances),
    [monitoringInstances]
  );

  const { mutate: createMonitoringInstance, isPending: creatingInstance } =
    useCreateMonitoringInstance();
  const { mutate: deleteMonitoringInstance, isPending: removingInstance } =
    useDeleteMonitoringInstance();
  const { mutate: updateMonitoringInstance, isPending: updatingInstance } =
    useUpdateMonitoringInstance();
  const queryClient = useQueryClient();
  const columns = useMemo<MRT_ColumnDef<MonitoringInstanceTableElement>[]>(
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
        accessorKey: 'namespace',
        header: Messages.namespaces,
      },
    ],
    []
  );

  const handleOpenCreateModal = () => {
    setOpenCreateEditModal(true);
  };

  const handleOpenEditModal = (instance: MonitoringInstanceTableElement) => {
    setSelectedInstance(instance.raw);
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

  const handleDeleteInstance = (instance: MonitoringInstanceTableElement) => {
    setSelectedInstance(instance.raw);
    setOpenDeleteDialog(true);
  };

  const handleSubmitModal = (
    isEditMode: boolean,
    { name, url, namespace, verifyTLS, ...pmmData }: EndpointFormType
  ) => {
    if (isEditMode) {
      updateMonitoringInstance(
        {
          instanceName: name,
          payload: {
            url,
            type: 'pmm',
            namespace,
            verifyTLS,
            pmm: { ...pmmData },
            allowedNamespaces: [],
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
          namespace,
          verifyTLS,
          pmm: { ...pmmData },
          allowedNamespaces: [],
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

  const handleConfirmDelete = (instanceName: string, namespace: string) => {
    deleteMonitoringInstance(
      { instanceName, namespace },
      {
        onSuccess: (_, locationName) => {
          updateDataAfterDelete(
            queryClient,
            MONITORING_INSTANCES_QUERY_KEY,
            'name'
          )(_, locationName.instanceName);
          handleCloseDeleteDialog();
        },
      }
    );
  };

  return (
    <>
      <Table
        tableName="monitoringEndpoints"
        hideExpandAllIcon
        data={tableData}
        columns={columns}
        state={{
          isLoading: monitoringInstancesLoading,
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
        <ConfirmDialogNamespace
          isOpen={openDeleteDialog}
          selectedId={selectedInstance?.name || ''}
          selectedNamespace={selectedInstance?.namespace || ''}
          closeModal={handleCloseDeleteDialog}
          headerMessage={Messages.deleteDialogHeader}
          handleConfirm={handleConfirmDelete}
          disabledButtons={removingInstance}
        >
          {Messages.deleteConfirmation(selectedInstance!.name)}
        </ConfirmDialogNamespace>
      )}
    </>
  );
};
