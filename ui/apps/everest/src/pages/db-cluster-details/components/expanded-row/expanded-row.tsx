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

import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import { MRT_ColumnDef, MRT_Row } from 'material-react-table';
import { DBClusterComponent } from 'shared-types/components.types';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  CONTAINER_STATUS,
  CONTAINER_STATUS_TO_BASE_STATUS,
} from '../components.constants';
import StatusField from 'components/status-field';
import { useMemo } from 'react';
import { Container } from 'shared-types/components.types';
import { Table } from '@percona/ui-lib';
import { DATE_FORMAT } from 'consts';

const ExpandedRow = ({ row }: { row: MRT_Row<DBClusterComponent> }) => {
  const { containers, name } = row.original;
  const theme = useTheme();

  const columns = useMemo<MRT_ColumnDef<Container>[]>(() => {
    return [
      {
        header: 'Status',
        accessorKey: 'status',
        Cell: ({ cell, row }) => (
          <StatusField
            iconProps={{
              size: 'small',
            }}
            stackProps={{
              paddingLeft: 1,
              gap: 2,
              alignItems: 'center',
            }}
            status={cell.getValue<CONTAINER_STATUS>()}
            statusMap={CONTAINER_STATUS_TO_BASE_STATUS}
          >
            <Typography variant="body2">{row?.original?.name}</Typography>
          </StatusField>
        ),
      },
      {
        header: 'Fake column name',
        accessorKey: 'name',
        Cell: () => '',
      },
      {
        header: 'Fake column type',
        accessorKey: 'type',
        Cell: () => '',
      },
      {
        header: 'Age',
        accessorKey: 'started',
        Cell: ({ cell, row }) => {
          const date = new Date(cell.getValue<string>());
          return date && row?.original?.status === CONTAINER_STATUS.RUNNING ? (
            <Tooltip
              title={`Started at ${format(date, DATE_FORMAT)}`}
              placement="right"
              arrow
            >
              <Typography
                variant="caption"
                color={theme.palette.text.secondary}
              >
                {formatDistanceToNowStrict(date)} ago{' '}
              </Typography>
            </Tooltip>
          ) : (
            ''
          );
        },
      },
      {
        header: 'Restarts',
        accessorKey: 'restarts',
        Cell: ({ cell }) => {
          return (
            <Typography variant="caption" color={theme.palette.text.secondary}>
              {cell.getValue<string>()}
            </Typography>
          );
        },
      },
      {
        header: 'Fake column ready',
        accessorKey: 'ready',
        Cell: () => '',
      },
    ];
  }, []);

  return (
    <Box
      data-testid="containers-table"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        cursor: 'auto',
        py: 1,
        width: '100%',
        justifyContent: 'start',
        alignItems: 'start',
        '& .MuiPaper-root': {
          width: '100%',
          paddingRight: '60px',
        },
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Table
        state={{ isLoading: false }}
        tableName={`${name}-containers`}
        columns={columns}
        data={containers}
        noDataMessage={'No containers'}
        enableTableHead={false}
        enableTopToolbar={false}
        muiTableBodyCellProps={{
          sx: {
            '&': {
              border: 'none',
              py: 0.5,
            },
          },
        }}
      />
    </Box>
  );
};

export default ExpandedRow;
