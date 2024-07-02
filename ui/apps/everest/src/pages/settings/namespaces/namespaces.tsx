import { Table } from '@percona/ui-lib';
import { MRT_ColumnDef } from 'material-react-table';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { NamespaceInstance } from 'shared-types/namespaces.types';
import { useDBEnginesForNamespaces } from 'hooks/api/namespaces/useNamespaces';
import { Messages } from './namespaces.messages';

export const Namespaces = () => {
  const navigate = useNavigate();
  const dbEngines = useDBEnginesForNamespaces();
  const namespacesData = dbEngines.map((item) => ({
    name: item.namespace,
    operator: item.isSuccess
      ? item.data?.reduce((prevVal, currVal, idx) => {
          if (idx === 0 || prevVal === '') {
            if (currVal?.type && currVal?.operatorVersion) {
              return `${currVal.type} (${currVal.operatorVersion})`;
            } else return '';
          } else {
            return (
              prevVal + '; ' + `${currVal.type} (${currVal.operatorVersion})`
            );
          }
        }, '')
      : '-',
  }));

  const isFetching = dbEngines.some((result) => result.isLoading);

  const columns = useMemo<MRT_ColumnDef<NamespaceInstance>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Namespace',
      },
      {
        accessorKey: 'operator',
        header: 'Operator',
      },
    ],
    []
  );

  return (
    <>
      <Table
        tableName="namespaces"
        noDataMessage={Messages.noDataMessage}
        hideExpandAllIcon
        state={{
          isLoading: isFetching,
        }}
        columns={columns}
        data={namespacesData}
        muiTableBodyRowProps={({ row }) => ({
          onClick: () => {
            navigate(`/settings/namespaces/${row.original.name}`);
          },
          sx: {
            cursor: 'pointer',
          },
        })}
        // enableRowActions
        // renderRowActionMenuItems={({ row, closeMenu }) => [
        //     <MenuItem
        //         key={1} //TODO EVEREST-677 actions will be in later iterations (now we haven't mockups)
        //         onClick={() => {
        //             // handleDe(row.original.name);
        //             closeMenu();
        //         }}
        //         sx={{ m: 0, display: 'flex', gap: 1, px: 2, py: '10px' }}
        //     >
        //         <Delete />
        //         {Messages.delete}
        //     </MenuItem>,
        // ]}
      />
    </>
  );
};
