import { useMemo } from 'react';
import { Table } from '@percona/ui-lib';
import { MRT_ColumnDef } from 'material-react-table';
import { Messages } from './namespaces.messages';
import { NamespaceInstance } from 'shared-types/namespaces.types';
import { useDBEnginesForNamespaces } from '../../../hooks/api/namespaces/useNamespaces';

export const Namespaces = () => {
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
        noDataMessage={Messages.noDataMessage}
        hideExpandAllIcon
        state={{
          isLoading: isFetching,
        }}
        columns={columns}
        data={namespacesData}
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
