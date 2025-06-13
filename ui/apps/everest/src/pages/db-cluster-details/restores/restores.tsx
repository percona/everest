import { useParams, useLocation } from 'react-router-dom';
import { Alert, capitalize } from '@mui/material';
import { MRT_ColumnDef } from 'material-react-table';
import { format } from 'date-fns';
import { Table } from '@percona/ui-lib';
import { DATE_FORMAT } from 'consts';
import StatusField from 'components/status-field/status-field';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import { useDbClusterPitr } from 'hooks/api/backups/useBackups';
import {
  PG_STATUS,
  PSMDB_STATUS,
  PXC_STATUS,
  Restore,
} from 'shared-types/restores.types';
import { Messages } from './restores.messages';
import { Messages as DbDetailsMessages } from '../db-cluster-details.messages';
import {
  RESTORES_QUERY_KEY,
  useDbClusterRestores,
  useDeleteRestore,
} from 'hooks/api/restores/useDbClusterRestore';
import { useMemo, useState } from 'react';
import { RESTORE_STATUS_TO_BASE_STATUS } from './restores.constants';
import { useQueryClient } from '@tanstack/react-query';
import TableActionsMenu from 'components/table-actions-menu';
import { RestoreActionButtons } from './restores-menu-actions';

const Restores = () => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedRestore, setSelectedRestore] = useState('');
  const { dbClusterName, namespace = '' } = useParams();
  const location = useLocation();
  const cluster = location.state?.cluster || 'in-cluster';
  const queryClient = useQueryClient();
  const { data: pitrData } = useDbClusterPitr(dbClusterName!, namespace, cluster, {
    enabled: !!dbClusterName && !!namespace,
  });
  const { data: restores = [], isLoading: loadingRestores } =
    useDbClusterRestores(namespace, dbClusterName!, cluster, {
      enabled: !!dbClusterName && !!namespace,
    });
  const { mutate: deleteRestore, isPending: deletingRestore } =
    useDeleteRestore(namespace, cluster);

  const columns = useMemo<MRT_ColumnDef<Restore>[]>(() => {
    return [
      {
        header: 'Status',
        accessorKey: 'state',
        Cell: ({ cell }) => (
          <StatusField
            status={cell.getValue<PXC_STATUS | PSMDB_STATUS | PG_STATUS>()}
            statusMap={RESTORE_STATUS_TO_BASE_STATUS}
          >
            {capitalize(cell.getValue<PXC_STATUS | PSMDB_STATUS | PG_STATUS>())}
          </StatusField>
        ),
      },
      {
        header: 'Name',
        accessorKey: 'name',
      },
      {
        header: 'Started',
        accessorKey: 'startTime',
        Cell: ({ cell }) =>
          cell.getValue<Date>()
            ? format(new Date(cell.getValue<Date>()), DATE_FORMAT)
            : '-----',
      },
      {
        header: 'Finished',
        accessorKey: 'endTime',
        Cell: ({ cell }) =>
          cell.getValue<Date>()
            ? format(new Date(cell.getValue<Date>()), DATE_FORMAT)
            : '-----',
      },
      {
        header: 'Type',
        accessorKey: 'type',
        Cell: ({ cell }) => (cell.getValue() === 'pitr' ? 'PITR' : 'Full'),
      },
      {
        header: 'Backup Source',
        accessorKey: 'backupSource',
      },
    ];
  }, []);

  const handleDeleteBackup = (restoreName: string) => {
    setSelectedRestore(restoreName);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = (restoreName: string) => {
    deleteRestore(restoreName, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [RESTORES_QUERY_KEY, namespace, dbClusterName],
        });
        setOpenDeleteDialog(false);
      },
    });
  };

  return (
    <>
      {pitrData?.gaps && (
        <Alert severity="error">{DbDetailsMessages.pitrError}</Alert>
      )}
      <Table
        getRowId={(row) => row.name}
        state={{ isLoading: loadingRestores }}
        tableName={`${dbClusterName}-restore`}
        columns={columns}
        data={restores}
        initialState={{
          sorting: [
            {
              id: 'startTime',
              desc: false,
            },
            { id: 'endTime', desc: false },
          ],
        }}
        noDataMessage="No restores"
        enableRowActions
        renderRowActions={({ row }) => {
          const menuItems = RestoreActionButtons(
            row,
            handleDeleteBackup,
            namespace,
            dbClusterName!
          );
          return <TableActionsMenu menuItems={menuItems} />;
        }}
      />
      {openDeleteDialog && (
        <ConfirmDialog
          open={openDeleteDialog}
          selectedId={selectedRestore}
          cancelMessage="Cancel"
          closeModal={() => setOpenDeleteDialog(false)}
          headerMessage={Messages.deleteDialog.header}
          handleConfirm={handleConfirmDelete}
          disabledButtons={deletingRestore}
        >
          {Messages.deleteDialog.content(selectedRestore)}
        </ConfirmDialog>
      )}
    </>
  );
};

export default Restores;
