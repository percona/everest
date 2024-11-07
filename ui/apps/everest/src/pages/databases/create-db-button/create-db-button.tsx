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
import { Box, Button, Menu, MenuItem, Skeleton, Stack } from '@mui/material';
import { ArrowDropDownIcon } from '@mui/x-date-pickers/icons';
import { Messages } from '../dbClusterView.messages';
import { useDBEnginesForDbEngineTypes } from 'hooks';
import { dbEngineToDbType } from '@percona/utils';
import { humanizeDbType } from '@percona/ui-lib';
import { Link } from 'react-router-dom';

export const CreateDbButton = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  const [availableDbTypes, availableDbTypesFetching, refetch] =
    useDBEnginesForDbEngineTypes();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    if (!availableDbTypesFetching) {
      refetch();
    }
  };
  const closeMenu = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      <Button
        data-testid="add-db-cluster-button"
        size="small"
        variant="contained"
        sx={{ display: 'flex' }}
        aria-controls={open ? 'add-db-cluster-button-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        endIcon={<ArrowDropDownIcon />}
        disabled={availableDbTypes?.length===0} //TODO 1304 ?? should we block button itself during loading? What if no dbEngin
      >
        {Messages.createDatabase}
      </Button>
      <Menu
        id="add-db-cluster-button-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        onClick={closeMenu}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
          sx: { width: anchorEl && anchorEl.offsetWidth },
        }}
      >
        {availableDbTypesFetching ? (
          <Stack sx={{ gap: '3px' }}>
            <Skeleton variant="rectangular" height={38} />
            <Skeleton variant="rectangular" height={38} />
            <Skeleton variant="rectangular" height={38} />
          </Stack>
        ) : (
          <>
            {availableDbTypes.map((item) => (
              <MenuItem
                data-testid={`add-db-cluster-button-${item.type}`}
                disabled={!item.available}
                key={item.type}
                component={Link}
                to="/databases/new"
                sx={{
                  display: 'flex',
                  gap: 1,
                  alignItems: 'center',
                  px: 2,
                  py: '10px',
                }}
                state={{ selectedDbEngine: item.type }}
              >
                {humanizeDbType(dbEngineToDbType(item.type))}
              </MenuItem>
            ))}
          </>
        )}
      </Menu>
    </Box>
  );
};

export default CreateDbButton;
