import { useMemo } from 'react';
import { MRT_ColumnDef } from 'material-react-table';
import { Table } from '@percona/ui-lib';
import { OperatorUpgradeDb } from 'shared-types/dbEngines.types';
import { ClusterStatusTableProps } from './types';
import { Button } from '@mui/material';

const ClusterStatusTable = ({
  namespace,
  databases,
}: ClusterStatusTableProps) => {
  const columns = useMemo<MRT_ColumnDef<OperatorUpgradeDb>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Database name',
      },
      {
        accessorKey: 'message',
        header: 'Actions',
        Cell: ({ cell, row }) => {
          const task = row.original.pendingTask;
          const message = cell.getValue<string>();

          if (task === 'restart') {
            return <Button>{message}</Button>;
          }

          return message;
        },
      },
    ],
    []
  );

  return (
    <>
      <Table
        tableName={`${namespace}-upgrade-pending-actions`}
        noDataMessage="No pending actions"
        columns={columns}
        data={databases}
      />
    </>
  );
};

export default ClusterStatusTable;
