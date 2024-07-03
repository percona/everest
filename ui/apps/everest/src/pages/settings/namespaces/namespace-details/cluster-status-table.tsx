import { useCallback, useMemo, useRef, useState } from 'react';
import { MRT_ColumnDef } from 'material-react-table';
import { Button } from '@mui/material';
import { Table } from '@percona/ui-lib';
import semverCoerce from 'semver/functions/coerce';
import semverMajor from 'semver/functions/major';
import {
  DbEngineToolStatus,
  OperatorUpgradeDb,
} from 'shared-types/dbEngines.types';
import { DbCluster } from 'shared-types/dbCluster.types';
import { ClusterStatusTableProps } from './types';
import { useDbClusters } from 'hooks/api/db-clusters/useDbClusters';
import {
  useUpdateDbClusterCrd,
  useUpdateDbClusterEngine,
} from 'hooks/api/db-cluster/useUpdateDbCluster';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import { Messages } from './messages';

const ClusterStatusTable = ({
  namespace,
  databases,
  dbEngine,
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
  const { mutate: updateDbClusterEngine } = useUpdateDbClusterEngine();
  const [openUpdateCrDialog, setOpenUpdateCrDialog] = useState(false);
  const [openUpdateEngineDialog, setOpenUpdateEngineDialog] = useState(false);
  const selectedDbCluster = useRef<DbCluster>();
  const selectedDbEngineVersion = useRef<string>();

  const onDbClick = useCallback(
    (db: OperatorUpgradeDb) => {
      const { pendingTask } = db;
      selectedDbCluster.current = dbClusters.find(
        (cluster) => cluster.metadata.name === db.name
      );

      if (!selectedDbCluster.current?.metadata.name) {
        return;
      }

      if (pendingTask === 'restart') {
        if (selectedDbCluster.current.status?.recommendedCRVersion) {
          setOpenUpdateCrDialog(true);
        }
      } else if (pendingTask === 'upgradeEngine') {
        // We try to find the version in the message
        const coercedVersion = semverCoerce(db.message, {
          includePrerelease: true,
        });

        if (coercedVersion) {
          selectedDbEngineVersion.current = coercedVersion.toString();
          setOpenUpdateEngineDialog(true);
        } else {
          // Couldn't find the version in the message. Try to update to the latest version with same major as current and recommended
          const currenEngineVersion = semverCoerce(
            selectedDbCluster.current.spec.engine.version,
            { includePrerelease: true }
          );

          if (currenEngineVersion) {
            const currentMajor = currenEngineVersion.major;
            const availableVersions = dbEngine.availableVersions.engine
              .filter(({ version, status }) => {
                return (
                  status === DbEngineToolStatus.RECOMMENDED &&
                  semverMajor(version) === currentMajor
                );
              })
              .map(({ version }) => version);
            const sortedVersions = availableVersions.sort();
            if (sortedVersions.length) {
              selectedDbEngineVersion.current =
                sortedVersions[sortedVersions.length - 1];
              setOpenUpdateEngineDialog(true);
            }
          }
        }
      }
    },
    [dbClusters, dbEngine.availableVersions.engine]
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
    setOpenUpdateCrDialog(false);
  };

  const onEngineUpdate = async () => {
    if (!selectedDbCluster.current || !selectedDbEngineVersion.current) {
      return;
    }

    const {
      metadata: { name, namespace },
    } = selectedDbCluster.current;

    await updateDbClusterEngine({
      clusterName: name,
      namespace,
      dbCluster: selectedDbCluster.current,
      newEngineVersion: selectedDbEngineVersion.current,
    });
    setOpenUpdateEngineDialog(false);
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

          if (task === 'restart' || task === 'upgradeEngine') {
            return (
              <Button
                data-testid="update-db-button"
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
        isOpen={openUpdateCrDialog}
        selectedId={selectedDbCluster.current?.metadata.name || ''}
        closeModal={() => setOpenUpdateCrDialog(false)}
        handleConfirm={onCrdUpdate}
        headerMessage="Upgrade CRD Version"
        submitMessage="Upgrade"
      >
        {Messages.upgradeCRVersion(
          selectedDbCluster.current?.metadata.name || '',
          selectedDbCluster.current?.status?.recommendedCRVersion || ''
        )}
      </ConfirmDialog>
      <ConfirmDialog
        isOpen={openUpdateEngineDialog}
        selectedId={selectedDbCluster.current?.metadata.name || ''}
        closeModal={() => setOpenUpdateEngineDialog(false)}
        handleConfirm={onEngineUpdate}
        headerMessage="Upgrade Engine Version"
        submitMessage="Upgrade"
      >
        {Messages.upgradeEngineVersion(
          selectedDbCluster.current?.metadata.name || '',
          selectedDbEngineVersion.current || ''
        )}
      </ConfirmDialog>
    </>
  );
};

export default ClusterStatusTable;
