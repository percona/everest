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

import { useMemo, useState } from 'react';
import { Box, Button, Menu, MenuItem } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { ArrowDropDownIcon } from '@mui/x-date-pickers/icons';
import { Messages } from '../dbClusterView.messages';
import { DbEngineType, DbType } from '@percona/types';
import { useAvailableDBEngineTypes } from 'hooks';
import { dbEngineToDbType } from '@percona/utils';
import { humanizeDbType } from '@percona/ui-lib';

export const CreateDbButton = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  const closeMenu = () => {
    setAnchorEl(null);
  };
  // TODO cases:
  // No one db in all namespaces
  // No db at all
  // Loading displaing?

  const {availableDbEngineTypes, availableDbEngineTypesFetching} = useAvailableDBEngineTypes();
  // const dbEnginesFetching = dbEnginesForNamespaces.some(
  //   (result) => result.isFetching
  // );

  // const getAvailableDbEngines = useMemo(()=> {
  //   const dbEngines = Object.keys(DbEngineType).forEach(item => {

  //   });
  //   return dbEngines;
  // },[dbEnginesForNamespaces])

  debugger;

  //TODO
  //   const nodbAvailable = false;

  // {dbEnginesFetching || !dbEngines.length ? (
  //     // This is roughly the height of the buttons
  //     <Skeleton height={57} variant="rectangular" />
  //   ) : (
  //     <ToggleButtonGroupInput
  //       name={DbWizardFormFields.dbType}
  //       toggleButtonGroupProps={{
  //         sx: { mb: 2 },
  //       }}
  //     >
  //       {dbEngines.map(({ type }) => (
  //         <DbToggleCard
  //           key={type}
  //           value={dbEngineToDbType(type)}
  //           disabled={
  //             (mode === 'edit' || mode === 'restoreFromBackup') &&
  //             dbType !== dbEngineToDbType(type)
  //           }
  //           onClick={() => {
  //             if (dbEngineToDbType(type) !== dbType) {
  //               onDbTypeChange(dbEngineToDbType(type));
  //             }
  //           }}
  //         />
  //       ))}
  //     </ToggleButtonGroupInput>
  //   )}

  return (
    <Box>
      <Button
        data-testid="create-db-button"
        size="small"
        variant="contained"
        sx={{ display: 'flex' }}
        aria-controls={open ? 'create-db-button-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        endIcon={<ArrowDropDownIcon />}
      >
        {Messages.createDatabase}
      </Button>
      <Menu
        id="create-db-button-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        onClick={closeMenu}
        MenuListProps={{
          'aria-labelledby': 'row-actions-button',
        }}
      >
        {availableDbEngineTypes.map(item => <MenuItem data-testid={item.type} disabled={!item.available} key={item.type} onClick={() => {console.log(item.type)}}>
          {humanizeDbType(dbEngineToDbType(item.type))}
        </MenuItem>)}
      </Menu>
    </Box>
  );
};

export default CreateDbButton;
