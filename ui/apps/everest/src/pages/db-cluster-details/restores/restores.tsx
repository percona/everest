import { useParams } from 'react-router-dom';
import { Alert, MenuItem } from '@mui/material';
import { Delete } from '@mui/icons-material';
import { MRT_ColumnDef } from 'material-react-table';
import { format, isValid } from 'date-fns';
import { useDbCluster } from 'hooks/api/db-cluster/useDbCluster';
import { useDbClusterPitr } from 'hooks/api/backups/useBackups';
import { DATE_FORMAT } from 'consts';
import { Restore } from 'shared-types/restores.types';
import { Messages } from './restores.messages';
import { useDbClusterRestores } from 'hooks/api/restores/useDbClusterRestore';
import { useMemo } from 'react';
import { Table } from '@percona/ui-lib';

const Restores = () => {
  const { dbClusterName, namespace = '' } = useParams();
  const { data: dbCluster, isLoading: loadingCluster } = useDbCluster(
    dbClusterName!,
    namespace,
    { enabled: !!dbClusterName && !!namespace }
  );
  const { data: pitrData } = useDbClusterPitr(dbClusterName!, namespace, {
    enabled: !!dbClusterName && !!namespace,
  });
  const { data: restores = [], isLoading: loadingRestores } =
    useDbClusterRestores(namespace, dbClusterName!);

  const columns = useMemo<MRT_ColumnDef<Restore>[]>(() => {
    return [
      {
        header: 'Status',
        accessorKey: 'state',
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
    ];
  }, []);

  if (loadingCluster) {
    return null;
  }

  return (
    <>
      {pitrData?.gaps && (
        <Alert severity="error" title="">
          {Messages.pitrError}
        </Alert>
      )}
      <Table
        state={{ isLoading: loadingRestores }}
        tableName={`${dbClusterName}-restore`}
        columns={columns}
        data={restores}
        noDataMessage="No restores"
        enableRowActions
        renderRowActionMenuItems={({ row, closeMenu }) => [
          <MenuItem
            key={2}
            onClick={() => {
              // handleDeleteBackup(row.original.name);
              // closeMenu();
            }}
            sx={{ m: 0 }}
          >
            <Delete />
            Delete
          </MenuItem>,
        ]}
      />
    </>
  );
};

export default Restores;
