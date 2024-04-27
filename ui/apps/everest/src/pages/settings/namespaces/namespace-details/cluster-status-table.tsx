import { useMemo } from 'react';
import { Table } from '@percona/ui-lib';
import { ClusterStatusTableProps } from './types';

const ClusterStatusTable = ({
  namespace,
  databases,
}: ClusterStatusTableProps) => {
  const columns = useMemo(
    () => [
      // {
      //   accessorKey: 'status',
      //   header: 'Status',
      //   Cell: ({ cell }) => (
      //     <StatusField
      //       dataTestId={cell?.row?.original?.databaseName}
      //       status={cell.getValue()}
      //       statusMap={DB_CLUSTER_STATUS_TO_BASE_STATUS}
      //     >
      //       {beautifyDbClusterStatus(cell.getValue())}
      //     </StatusField>
      //   ),
      // },
      {
        accessorKey: 'name',
        header: 'Database name',
      },
      // {
      //   accessorKey: 'crdVersion',
      //   header: 'CRD version',
      // },
      {
        accessorKey: 'pendingTask',
        header: 'Pending tasks',
      },
    ],
    []
  );

  // const data = useMemo(
  //   () => [
  //     {
  //       status: 'ready',
  //       name: 'Cluster A-87',
  //       crdVersion: '4.5.0',
  //       tasks: 'Restart Database',
  //     },
  //   ],
  //   []
  // );

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
