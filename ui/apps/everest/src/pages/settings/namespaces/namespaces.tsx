import { useMemo } from 'react';
import { Table } from '@percona/ui-lib';
import { Typography } from '@mui/material';
import { MRT_ColumnDef } from 'material-react-table';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getClustersFn, Cluster } from 'api/clusters';
import { getNamespacesForCluster } from 'api/namespaces';
import { getDbEnginesFn } from 'api/dbEngineApi';
import { Messages } from './namespaces.messages';
import { OperatorCell } from './OperatorCell';
import EmptyStateNamespaces from 'components/empty-state-namespaces';

export const Namespaces = () => {
  // 1. Fetch all clusters
  const { data: clusters = [], isLoading: isLoadingClusters } = useQuery<Cluster[]>({
    queryKey: ['clusters'],
    queryFn: getClustersFn,
  });

  // 2. Fetch namespaces for each cluster
  const namespacesQueries = useQueries({
    queries: clusters.map((cluster) => ({
      queryKey: ['namespaces', cluster.name],
      queryFn: () => getNamespacesForCluster(cluster.name),
      enabled: !!cluster.name,
    })),
  });

  // Only consider clusters/namespaces that actually exist
  const nonEmptyClusterNamespacePairs = clusters.flatMap((cluster, idx) => {
    const namespaces = namespacesQueries[idx]?.data || [];
    if (!Array.isArray(namespaces) || namespaces.length === 0) return [];
    return namespaces.map((ns: string) => ({ cluster: cluster.name, namespace: ns }));
  });

  const dbEnginesQueries = useQueries({
    queries: nonEmptyClusterNamespacePairs.map(({ cluster, namespace }) => ({
      queryKey: ['dbEngines', cluster, namespace],
      queryFn: () => getDbEnginesFn(cluster, namespace),
      enabled: !!cluster && !!namespace,
    })),
  });

  // Flatten and build table data only for non-empty clusters/namespaces
  const namespacesData = dbEnginesQueries.map((query, idx) => {
    const { cluster, namespace } = nonEmptyClusterNamespacePairs[idx] || {};
    const item = query.data;
    const engines = item?.items || [];
    return {
      name: namespace,
      cluster,
      upgradeAvailable: false, // TODO: add upgrade logic if needed
      operators: engines.map((engine: any) => engine.metadata?.name) || [],
      pendingActions: [], // TODO: add pending actions if needed
      operatorsDescription: engines.length
        ? engines.reduce((prevVal: string, currVal: any, idx: number) => {
            if (idx === 0 || prevVal === '') {
              if (currVal?.spec?.type && currVal?.status?.operatorVersion) {
                return `${currVal.spec.type} (${currVal.status.operatorVersion})`;
              } else return '';
            } else {
              return prevVal + '; ' + `${currVal.spec.type} (${currVal.status.operatorVersion})`;
            }
          }, '')
        : '-',
    };
  });

  // Only show loading if any visible (non-empty) cluster/namespace is still loading
  const isFetching =
    isLoadingClusters ||
    namespacesQueries.some((q, idx) => {
      const namespaces = namespacesQueries[idx]?.data || [];
      return Array.isArray(namespaces) && namespaces.length > 0 && q.isLoading;
    }) ||
    dbEnginesQueries.some((q) => q.isLoading);

  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Namespace',
        Cell: ({ cell }) => <Typography>{cell.getValue<string>()}</Typography>,
      },
      {
        accessorKey: 'cluster',
        header: 'Cluster',
        Cell: ({ cell }) => <Typography>{cell.getValue<string>()}</Typography>,
      },
      {
        accessorKey: 'operatorsDescription',
        header: 'Operator',
        Cell: ({ cell, row }) => (
          <OperatorCell
            description={cell.getValue<string>()}
            namespaceInstance={row.original}
          />
        ),
      },
    ],
    []
  );

  return (
    <>
      <Table
        getRowId={(row) => row.name + '-' + row.cluster}
        tableName="namespaces"
        noDataMessage={Messages.noDataMessage}
        emptyState={<EmptyStateNamespaces />}
        hideExpandAllIcon
        state={{
          isLoading: isFetching,
        }}
        columns={columns}
        data={namespacesData}
      />
    </>
  );
};
