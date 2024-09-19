// everest
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { MRT_Row } from 'material-react-table';
import { DbClusterTableElement } from './dbClusterView.types';
import { MenuItem } from '@mui/material';
import { Link } from 'react-router-dom';
import {
  BorderColor,
  DeleteOutline,
  PauseCircleOutline,
} from '@mui/icons-material';
import { Messages } from './dbClusterView.messages';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AddIcon from '@mui/icons-material/Add';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import { DbCluster, DbClusterStatus } from 'shared-types/dbCluster.types';
import { useRBACPermissions } from 'hooks/rbac';

export const DbActionButtons = (
  row: MRT_Row<DbClusterTableElement>,
  setIsNewClusterMode: React.Dispatch<React.SetStateAction<boolean>>,
  handleDbRestart: (dbCluster: DbCluster) => void,
  handleDbSuspendOrResumed: (dbCluster: DbCluster) => void,
  handleDeleteDbCluster: (dbCluster: DbCluster) => void,
  isPaused: (dbCluster: DbCluster) => boolean | undefined,
  handleRestoreDbCluster: (dbCluster: DbCluster) => void
) => {
  const {
    canUpdate,
    canDelete,
    canCreate: canCreateClusters,
  } = useRBACPermissions(
    'database-clusters',
    `${row.original.namespace}/${row.original.databaseName}`
  );
  const { canCreate: canCreateRestore } = useRBACPermissions(
    'database-cluster-restores',
    `${row.original.namespace}/*`
  );
  const { canRead: canReadCredentials } = useRBACPermissions(
    'database-cluster-credentials',
    `${row.original.namespace}/${row.original.databaseName}`
  );

  const canRestore = canCreateRestore && canReadCredentials;
  const canCreateClusterFromBackup = canRestore && canCreateClusters;

  return [
    ...(canUpdate
      ? [
          <MenuItem
            disabled={row.original.status === DbClusterStatus.restoring}
            key={0}
            component={Link}
            to="/databases/edit"
            state={{
              selectedDbCluster: row.original.databaseName!,
              namespace: row.original.namespace,
            }}
            sx={{
              m: 0,
              gap: 1,
              alignItems: 'center',
              px: 2,
              py: '10px',
            }}
          >
            <BorderColor fontSize="small" /> {Messages.menuItems.edit}
          </MenuItem>,
          <MenuItem
            disabled={row.original.status === DbClusterStatus.restoring}
            key={2}
            onClick={() => {
              handleDbRestart(row.original.raw);
            }}
            sx={{
              m: 0,
              gap: 1,
              alignItems: 'center',
              px: 2,
              py: '10px',
            }}
          >
            <RestartAltIcon /> {Messages.menuItems.restart}
          </MenuItem>,
        ]
      : []),
    ...(canCreateClusterFromBackup
      ? [
          <MenuItem
            disabled={row.original.status === DbClusterStatus.restoring}
            key={5}
            onClick={() => {
              handleRestoreDbCluster(row.original.raw);
              setIsNewClusterMode(true);
            }}
            sx={{
              gap: 1,
              alignItems: 'center',
              px: 2,
              py: '10px',
            }}
          >
            <AddIcon /> {Messages.menuItems.createNewDbFromBackup}
          </MenuItem>,
        ]
      : []),
    ...(canRestore
      ? [
          <MenuItem
            disabled={row.original.status === DbClusterStatus.restoring}
            key={3}
            data-testid={`${row.original?.databaseName}-restore`}
            onClick={() => {
              handleRestoreDbCluster(row.original.raw);
              setIsNewClusterMode(false);
            }}
            sx={{
              gap: 1,
              alignItems: 'center',
              px: 2,
              py: '10px',
            }}
          >
            <KeyboardReturnIcon /> {Messages.menuItems.restoreFromBackup}
          </MenuItem>,
        ]
      : []),
    ...(canUpdate
      ? [
          <MenuItem
            key={4}
            disabled={
              row.original.status === DbClusterStatus.pausing ||
              row.original.status === DbClusterStatus.restoring
            }
            onClick={() => {
              handleDbSuspendOrResumed(row.original.raw);
            }}
            sx={{
              m: 0,
              gap: 1,
              alignItems: 'center',
              px: 2,
              py: '10px',
            }}
          >
            <PauseCircleOutline />{' '}
            {isPaused(row.original.raw)
              ? Messages.menuItems.resume
              : Messages.menuItems.suspend}
          </MenuItem>,
        ]
      : []),
    ...(canDelete
      ? [
          <MenuItem
            data-testid={`${row.original?.databaseName}-delete`}
            key={1}
            onClick={() => {
              handleDeleteDbCluster(row.original.raw);
            }}
            disabled={row.original?.status === DbClusterStatus.deleting}
            sx={{
              m: 0,
              gap: 1,
              alignItems: 'center',
              px: 2,
              py: '10px',
            }}
          >
            <DeleteOutline /> {Messages.menuItems.delete}
          </MenuItem>,
        ]
      : []),
  ];
};
