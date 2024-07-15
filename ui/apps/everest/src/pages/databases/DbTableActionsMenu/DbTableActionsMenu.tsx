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

import { useState } from 'react';
import { Box, IconButton, Menu, MenuItem } from '@mui/material';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import { MRT_Row } from 'material-react-table';
import { DbClusterTableElement } from '../dbClusterView.types';
import { Link } from 'react-router-dom';
import {
  BorderColor,
  DeleteOutline,
  PauseCircleOutline,
} from '@mui/icons-material';
import { Messages } from '../dbClusterView.messages';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AddIcon from '@mui/icons-material/Add';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import { DbCluster, DbClusterStatus } from 'shared-types/dbCluster.types';
import { useDbActions } from 'hooks/api/db-cluster/useDbActions';
import { useGetPermissions } from 'utils/useGetPermissions';

const DbActionButtons = (
  row: MRT_Row<DbClusterTableElement>,
  closeMenu: (event: React.MouseEvent) => void,
  setIsNewClusterMode: React.Dispatch<React.SetStateAction<boolean>>,
  handleDbRestart: (dbCluster: DbCluster) => void,
  handleDbSuspendOrResumed: (dbCluster: DbCluster) => void,
  handleDeleteDbCluster: (dbCluster: DbCluster) => void,
  isPaused: (dbCluster: DbCluster) => boolean | undefined,
  handleRestoreDbCluster: (dbCluster: DbCluster) => void,
  canCreate: boolean
) => {
  const { canUpdate, canDelete } = useGetPermissions({
    resource: 'database-clusters',
    specificResource: row.original.databaseName,
    namespace: row.original.namespace,
  });

  return [
    <MenuItem
      disabled={row.original.status === DbClusterStatus.restoring}
      key={0}
      component={Link}
      onClick={(event) => {
        closeMenu(event);
      }}
      to="/databases/edit"
      state={{
        selectedDbCluster: row.original.databaseName!,
        namespace: row.original.namespace,
      }}
      sx={{
        m: 0,
        display: canUpdate ? 'flex' : 'none',
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
      onClick={(event) => {
        handleDbRestart(row.original.raw);
        closeMenu(event);
      }}
      sx={{
        m: 0,
        display: canUpdate ? 'flex' : 'none',
        gap: 1,
        alignItems: 'center',
        px: 2,
        py: '10px',
      }}
    >
      <RestartAltIcon /> {Messages.menuItems.restart}
    </MenuItem>,
    <MenuItem
      disabled={row.original.status === DbClusterStatus.restoring}
      key={5}
      onClick={(event) => {
        handleRestoreDbCluster(row.original.raw);
        setIsNewClusterMode(true);
        closeMenu(event);
      }}
      sx={{
        display: canCreate ? 'flex' : 'none',
        gap: 1,
        alignItems: 'center',
        px: 2,
        py: '10px',
      }}
    >
      <AddIcon /> {Messages.menuItems.createNewDbFromBackup}
    </MenuItem>,
    <MenuItem
      disabled={row.original.status === DbClusterStatus.restoring || !canUpdate}
      key={3}
      data-testid={`${row.original?.databaseName}-restore`}
      onClick={(event) => {
        handleRestoreDbCluster(row.original.raw);
        setIsNewClusterMode(false);
        closeMenu(event);
      }}
      sx={{
        display: canUpdate ? 'flex' : 'none',
        gap: 1,
        alignItems: 'center',
        px: 2,
        py: '10px',
      }}
    >
      <KeyboardReturnIcon /> {Messages.menuItems.restoreFromBackup}
    </MenuItem>,
    <MenuItem
      key={4}
      disabled={
        row.original.status === DbClusterStatus.pausing ||
        row.original.status === DbClusterStatus.restoring
      }
      onClick={(event) => {
        handleDbSuspendOrResumed(row.original.raw);
        closeMenu(event);
      }}
      sx={{
        m: 0,
        display: canUpdate ? 'flex' : 'none',
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
    <MenuItem
      data-testid={`${row.original?.databaseName}-delete`}
      key={1}
      onClick={(event) => {
        handleDeleteDbCluster(row.original.raw);
        closeMenu(event);
      }}
      sx={{
        m: 0,
        display: canDelete ? 'flex' : 'none',
        gap: 1,
        alignItems: 'center',
        px: 2,
        py: '10px',
      }}
    >
      <DeleteOutline /> {Messages.menuItems.delete}
    </MenuItem>,
  ];
};

type TableActionsMenuProps = {
  row: MRT_Row<DbClusterTableElement>;
  setIsNewClusterMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export const DbTableActionsMenu = ({
  row,
  setIsNewClusterMode,
}: TableActionsMenuProps) => {
  const {
    handleDbRestart,
    handleDbSuspendOrResumed,
    handleDeleteDbCluster,
    isPaused,
    handleRestoreDbCluster,
  } = useDbActions();
  const { canCreate } = useGetPermissions({ resource: 'database-clusters' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    event.stopPropagation();
  };
  const handleClose = (event: React.MouseEvent) => {
    event.stopPropagation();
    setAnchorEl(null);
  };

  const menuItems = DbActionButtons(
    row,
    handleClose,
    setIsNewClusterMode,
    handleDbRestart,
    handleDbSuspendOrResumed,
    handleDeleteDbCluster,
    isPaused,
    handleRestoreDbCluster,
    canCreate
  );

  return (
    <Box>
      <IconButton
        data-testid={'actions-menu-button'}
        aria-haspopup="true"
        aria-controls={open ? 'basic-menu' : undefined}
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        disabled={menuItems?.length === 0}
      >
        <MoreHorizOutlinedIcon />
      </IconButton>
      {menuItems?.length > 0 && (
        <Menu
          id="row-actions-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={(event: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
            handleClose(event);
          }}
          MenuListProps={{
            'aria-labelledby': 'row-actions-button',
          }}
        >
          {...menuItems}
        </Menu>
      )}
    </Box>
  );
};
