import { useCallback, useMemo, useRef, useState } from 'react';
import { MRT_ColumnDef } from 'material-react-table';
import { Button } from '@mui/material';
import { Table } from '@percona/ui-lib';
import { OperatorUpgradeDb } from 'shared-types/dbEngines.types';
import { DbCluster } from 'shared-types/dbCluster.types';
import { ClusterStatusTableProps } from './types';
import { useDbClusters } from 'hooks/api/db-clusters/useDbClusters';
import { useUpdateDbClusterCrd } from 'hooks/api/db-cluster/useUpdateDbCluster';
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
  const { mutate: updateDbClusterCrd } = useUpdateDbClusterCrd();
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

  const onCrdUpdate = async () => {
    if (
      !selectedDbCluster.current ||
      !selectedDbCluster.current.status?.recommendedCRVersion
    ) {
      return;
    }

    const {
      metadata: { name, namespace },
    } = selectedDbCluster.current;
    await updateDbClusterCrd({
      clusterName: name,
      namespace,
      dbCluster: selectedDbCluster.current,
      newCrdVersion:
        selectedDbCluster.current.status?.recommendedCRVersion || '',
    });
    setOpenDialog(false);
  };

  const columns = useMemo<MRT_ColumnDef<OperatorUpgradeDb>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Database name',
      },
      {
        id: 'crd',
        accessorFn: (row) => row.name,
        header: 'CRD Version',
        Cell: ({ cell }) => {
          if (!dbClusters.length) {
            return null;
          }

          const db = dbClusters.find(
            (cluster) => cluster.metadata.name === cell.getValue()
          );

          return db?.status?.crVersion || 'N/A';
        },
      },
      {
        accessorKey: 'message',
        header: 'Actions',
        Cell: ({ cell, row }) => {
          const task = row.original.pendingTask;
          const message = cell.getValue<string>();

          if (task === 'restart') {
            return (
              <Button
                data-testid="update-crd-button"
                onClick={() => onDbClick(row.original)}
              >
                {message}
              </Button>
            );
          }

          return message || task;
        },
      },
    ],
    [dbClusters, onDbClick]
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
        handleConfirm={onCrdUpdate}
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
