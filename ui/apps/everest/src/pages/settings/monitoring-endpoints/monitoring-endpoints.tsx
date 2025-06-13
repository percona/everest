import { Add } from '@mui/icons-material';
import { Button } from '@mui/material';
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
import { CreateEditEndpointModal } from './createEditModal/create-edit-modal';
import { EndpointFormType } from './createEditModal/create-edit-modal.types';
import { Messages } from './monitoring-endpoints.messages';
import { useNamespaces } from 'hooks/api/namespaces';
import { convertMonitoringInstancesPayloadToTableFormat } from './monitoring-endpoints.utils';
import { MonitoringInstanceTableElement } from './monitoring-endpoints.types';
import { useNamespacePermissionsForResource } from 'hooks/rbac';
import TableActionsMenu from '../../../components/table-actions-menu';
import { MonitoringActionButtons } from './monitoring-endpoint-menu-actions';

export const MonitoringEndpoints = () => {
  const [openCreateEditModal, setOpenCreateEditModal] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] =
    useState<MonitoringInstance>();
  const { data: namespaces = [] } = useNamespaces({
    refetchInterval: 10 * 1000,
  });
  const monitoringInstances = useMonitoringInstancesList(
    namespaces.map((ns) => ({
      namespace: ns,
    }))
  );

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
        header: Messages.columns.name,
      },
      {
        accessorKey: 'url',
        header: Messages.columns.url,
      },
      {
        accessorKey: 'cluster',
        header: Messages.columns.cluster,
      },
      {
        accessorKey: 'namespace',
        header: Messages.columns.namespace,
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
          cluster: selectedInstance?.cluster || 'in-cluster',
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
              [MONITORING_INSTANCES_QUERY_KEY, selectedInstance?.cluster || 'in-cluster', namespace],
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
          cluster: 'in-cluster',
        },
        {
          onSuccess: (newInstance) => {
            updateDataAfterCreate(queryClient, [
              MONITORING_INSTANCES_QUERY_KEY,
              'in-cluster',
              newInstance.namespace,
            ])(newInstance);
            handleCloseModal();
          },
        }
      );
    }
  };

  const handleConfirmDelete = (instanceName: string, namespace: string) => {
    deleteMonitoringInstance(
      { 
        instanceName, 
        namespace,
        cluster: selectedInstance?.cluster || 'in-cluster',
      },
      {
        onSuccess: (_, locationName) => {
          updateDataAfterDelete(
            queryClient,
            [MONITORING_INSTANCES_QUERY_KEY, selectedInstance?.cluster || 'in-cluster', namespace],
            'name'
          )(_, locationName.instanceName);
          handleCloseDeleteDialog();
        },
      }
    );
  };

  const { canCreate } = useNamespacePermissionsForResource(
    'monitoring-instances'
  );

  return (
    <>
      <Table
        getRowId={(row) => row.name}
        tableName="monitoringEndpoints"
        hideExpandAllIcon
        data={tableData}
        columns={columns}
        state={{
          isLoading: monitoringInstancesLoading,
        }}
        enableRowActions
        noDataMessage="No monitoring endpoint added"
        renderTopToolbarCustomActions={() =>
          canCreate.length > 0 && (
            <Button
              size="small"
              startIcon={<Add />}
              data-testid="add-monitoring-endpoint"
              variant="outlined"
              onClick={handleOpenCreateModal}
              sx={{ display: 'flex' }}
            >
              {Messages.add}
            </Button>
          )
        }
        renderRowActions={({ row }) => {
          const menuItems = MonitoringActionButtons(
            row,
            handleDeleteInstance,
            handleOpenEditModal
          );
          return <TableActionsMenu menuItems={menuItems} />;
        }}
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
          open={openDeleteDialog}
          cancelMessage="Cancel"
          selectedId={selectedInstance?.name || ''}
          selectedNamespace={selectedInstance?.namespace || ''}
          closeModal={handleCloseDeleteDialog}
          headerMessage={Messages.deleteDialogHeader}
          handleConfirmNamespace={handleConfirmDelete}
          disabledButtons={removingInstance}
        >
          {Messages.deleteConfirmation(selectedInstance!.name)}
        </ConfirmDialog>
      )}
    </>
  );
};
