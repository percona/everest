import { useCallback, useMemo, useRef, useState } from 'react';
import { MRT_ColumnDef } from 'material-react-table';
import { Button } from '@mui/material';
import { Table } from '@percona/ui-lib';
import { OperatorUpgradeDb } from 'shared-types/dbEngines.types';
import { DbCluster } from 'shared-types/dbCluster.types';
import { ClusterStatusTableProps } from './types';
import { useDbClusters } from 'hooks/api/db-clusters/useDbClusters';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import { Messages } from './messages';

const ClusterStatusTable = ({
  namespace,
  databases,
}: ClusterStatusTableProps) => {
  const dbNames = databases.map((db) => db.name);
  const { data: dbClusters = [] } = useDbClusters(namespace, {
    select: (clusters) =>
      clusters.items.filter((cluster) =>
        dbNames.includes(cluster.metadata.name)
      ),
    enabled: !!namespace && !!databases.length,
  });
  const [openDialog, setOpenDialog] = useState(false);
  const selectedDbCluster = useRef<DbCluster>();

  const onDbClick = useCallback(
    (db: OperatorUpgradeDb) => {
      selectedDbCluster.current = dbClusters.find(
        (cluster) => cluster.metadata.name === db.name
      );

      if (
        selectedDbCluster.current?.metadata.name &&
        selectedDbCluster.current.status?.recommendedCRVersion
      ) {
        setOpenDialog(true);
      }
    },
    [dbClusters]
  );

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
            return (
              <Button onClick={() => onDbClick(row.original)}>{message}</Button>
            );
          }

          return message;
        },
      },
    ],
    [onDbClick]
  );

  return (
    <>
      <Table
        tableName={`${namespace}-upgrade-pending-actions`}
        noDataMessage="No pending actions"
        columns={columns}
        data={databases}
      />
      <ConfirmDialog
        isOpen={openDialog}
        selectedId={selectedDbCluster.current?.metadata.name || ''}
        closeModal={() => setOpenDialog(false)}
        handleConfirm={() => null}
        headerMessage="Upgrade CRD Version"
        submitMessage="Upgrade"
      >
        {Messages.upgradeCRVersion(
          selectedDbCluster.current?.metadata.name || '',
          selectedDbCluster.current?.status?.recommendedCRVersion || ''
        )}
      </ConfirmDialog>
    </>
  );
};

export default ClusterStatusTable;
