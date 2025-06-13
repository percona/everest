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

import { useEffect, useState } from 'react';
import { Box, Button, Menu, MenuItem, Skeleton } from '@mui/material';
import { ArrowDropDownIcon } from '@mui/x-date-pickers/icons';
import { dbEngineToDbType } from '@percona/utils';
import { Link, useNavigate } from 'react-router-dom';
import { useDBEnginesForDbEngineTypes } from 'hooks';
import { useNamespacePermissionsForResource } from 'hooks/rbac';
import { humanizeDbType } from 'utils/db';

export const CreateDbButton = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showDropdownButton, setShowDropdownButton] = useState(false);
  const { canCreate } = useNamespacePermissionsForResource('database-clusters');

  const open = Boolean(anchorEl);

  // TODO: Replace 'in-cluster' with actual cluster selection logic
  const [availableDbTypes, dbEnginesFetching] =
    useDBEnginesForDbEngineTypes('in-cluster', undefined, {
      refetchInterval: 30 * 1000,
    });

  const availableEngines = availableDbTypes.filter(
    (item) =>
      !!item.available &&
      item.dbEngines.some((engine) => canCreate.includes(engine.namespace))
  );
  const navigate = useNavigate();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (availableEngines.length > 1) {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
    } else {
      navigate('/databases/new', {
        state: { selectedDbEngine: availableEngines[0].type },
      });
    }
  };
  const closeMenu = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    if (dbEnginesFetching) {
      setShowDropdownButton(false);
    } else {
      setTimeout(() => {
        setShowDropdownButton(true);
      }, 300);
    }
  }, [dbEnginesFetching]);

  const buttonStyle = { display: 'flex', minHeight: '34px', width: '165px' };
  const skeletonStyle = {
    ...buttonStyle,
    borderRadius: '128px',
  };

  return availableEngines.length > 0 ? (
    <Box>
      {showDropdownButton ? (
        <Button
          data-testid="add-db-cluster-button"
          size="small"
          variant="contained"
          sx={buttonStyle}
          aria-controls={open ? 'add-db-cluster-button-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
          endIcon={availableEngines.length > 1 && <ArrowDropDownIcon />}
        >
          Create database
        </Button>
      ) : (
        <Skeleton variant="rounded" sx={skeletonStyle} />
      )}
      {availableEngines.length > 1 && (
        <Menu
          data-testid="add-db-cluster-button-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={closeMenu}
          onClick={closeMenu}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
            sx: { width: anchorEl && anchorEl.offsetWidth },
          }}
        >
          {
            <Box>
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
            </Box>
          }
        </Menu>
      )}
    </Box>
  ) : null;
};

export default CreateDbButton;
