import { useMemo } from 'react';
import { MRT_ColumnDef } from 'material-react-table';
import { Tooltip } from '@mui/material';
import { Table } from '@percona/ui-lib';
import { DBClusterComponent } from 'shared-types/components.types';
import {
  COMPONENT_STATUS,
  COMPONENT_STATUS_WEIGHT,
  componentStatusToBaseStatus,
} from '../components.constants';
import { format, formatDistanceToNowStrict, isValid } from 'date-fns';
import { DATE_FORMAT } from 'consts';
import ExpandedRow from '../expanded-row';
import ComponentStatus from '../component-status';

const ComponentsTableView = ({
  components,
  isLoading,
  dbClusterName,
}: {
  components: DBClusterComponent[];
  isLoading: boolean;
  dbClusterName: string;
}) => {
  const columns = useMemo<MRT_ColumnDef<DBClusterComponent>[]>(() => {
    return [
      {
        header: 'Status',
        accessorKey: 'status',
        Cell: ({ cell, row }) => (
          <ComponentStatus
            status={cell.getValue<COMPONENT_STATUS>()}
            statusMap={componentStatusToBaseStatus(row.original.ready)}
          />
        ),
        sortingFn: (rowA, rowB) => {
          return (
            COMPONENT_STATUS_WEIGHT[rowA?.original?.status] -
            COMPONENT_STATUS_WEIGHT[rowB?.original?.status]
          );
        },
      },
      {
        header: 'Ready',
        accessorKey: 'ready',
      },
      {
        header: 'Name',
        accessorKey: 'name',
      },
      {
        header: 'Type',
        accessorKey: 'type',
      },
      {
        header: 'Age',
        accessorKey: 'started',
        Cell: ({ cell }) => {
          const date = new Date(cell.getValue<string>());

          return isValid(date) ? (
            <Tooltip
              title={`Started at ${format(date, DATE_FORMAT)}`}
              placement="right"
              arrow
            >
              <div>{formatDistanceToNowStrict(date)}</div>
            </Tooltip>
          ) : (
            ''
          );
        },
      },
      {
        header: 'Restarts',
        accessorKey: 'restarts',
      },
    ];
  }, []);

  return (
    <Table
      initialState={{
        sorting: [
          {
            id: 'status',
            desc: true,
          },
        ],
      }}
      state={{ isLoading }}
      tableName={`${dbClusterName}-components`}
      columns={columns}
      data={components}
      noDataMessage={'No components'}
      renderDetailPanel={({ row }) => <ExpandedRow row={row} />}
      muiTableDetailPanelProps={{
        sx: {
          padding: 0,
          width: '100%',
          '.MuiCollapse-root': {
            width: '100%',
          },
        },
      }}
    />
  );
};

export default ComponentsTableView;
