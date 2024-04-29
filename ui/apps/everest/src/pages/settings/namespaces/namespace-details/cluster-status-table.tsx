import { useMemo } from 'react';
import { MRT_ColumnDef } from 'material-react-table';
import { Table } from '@percona/ui-lib';
import {
  DbUpgradePendingTask,
  OperatorUpgradeDb,
} from 'shared-types/dbEngines.types';
import { ClusterStatusTableProps } from './types';

const TASK_STATUS_MAP: Record<DbUpgradePendingTask, string> = {
  notReady: 'Not ready',
  ready: 'Ready',
  restart: 'Restart',
  upgradeEngine: 'Upgrade engine',
};

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
        accessorKey: 'pendingTask',
        header: 'Pending task',
        Cell: ({ cell }) =>
          TASK_STATUS_MAP[cell.getValue<DbUpgradePendingTask>()],
      },
      {
        accessorKey: 'message',
        header: 'Message',
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
