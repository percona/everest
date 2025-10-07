import { Add } from '@mui/icons-material';
import { Button } from '@mui/material';
import { Table } from '@percona/ui-lib';
import { useMemo } from 'react';
import { useNamespaces } from 'hooks/api';
import { useQueries } from '@tanstack/react-query';
import { getAllSplitHorizonDNSConfigs } from 'api/splitHorizon';

const SplitHorizon = () => {
  const { data: namespaces = [] } = useNamespaces({
    refetchInterval: 10 * 1000,
  });
  const splitHorizonConfigs = useQueries({
    queries: namespaces.map((ns) => ({
      queryKey: ['split-horizon-configs', ns],
      queryFn: () => getAllSplitHorizonDNSConfigs(ns),
      refetchInterval: 10 * 1000,
    })),
  });

  const columns = useMemo(
    () => [
      {
        header: 'Domain name',
        accessorKey: 'domain',
      },
    ],
    []
  );

  const data = useMemo(
    () =>
      splitHorizonConfigs.flatMap((config) =>
        (config.data || []).map((config) => ({
          domain: config.baseDomainNameSuffix,
        }))
      ),
    [splitHorizonConfigs]
  );

  return (
    <Table
      tableName="split-horizon"
      columns={columns}
      data={data}
      renderTopToolbarCustomActions={() => (
        <Button
          variant="contained"
          size="medium"
          onClick={() => {}}
          data-testid="add-config-button"
          sx={{ display: 'flex' }}
          startIcon={<Add />}
        >
          Create configuration
        </Button>
      )}
    />
  );
};

export default SplitHorizon;
