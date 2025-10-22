import { Add } from '@mui/icons-material';
import { Button } from '@mui/material';
import { Table } from '@percona/ui-lib';
import { useMemo, useState } from 'react';
import { useCreateSplitHorizonConfig, useNamespaces } from 'hooks/api';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { getAllSplitHorizonDNSConfigs } from 'api/splitHorizon';
import ConfigurationModal from './configuration-modal';
import { fileToBase64 } from 'utils/db';

const SplitHorizon = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { mutate: createSplitHorizonConfig } = useCreateSplitHorizonConfig({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['split-horizon-configs'],
      });
      setIsModalOpen(false);
    },
  });
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
        header: 'Name',
        accessorKey: 'name',
      },
      {
        header: 'Domain name',
        accessorKey: 'domain',
      },
      {
        header: 'Namespace',
        accessorKey: 'namespace',
      },
    ],
    []
  );

  const data = useMemo(() => {
    return splitHorizonConfigs.flatMap(({ data }) =>
      (data || []).map((config) => ({
        name: config.metadata.name,
        domain: config.spec.baseDomainNameSuffix,
        namespace: config.namespace,
      }))
    );
  }, [splitHorizonConfigs]);

  return (
    <>
      <Table
        tableName="split-horizon"
        columns={columns}
        data={data}
        renderTopToolbarCustomActions={() => (
          <Button
            variant="contained"
            size="medium"
            onClick={() => setIsModalOpen(true)}
            data-testid="add-config-button"
            sx={{ display: 'flex' }}
            startIcon={<Add />}
          >
            Create configuration
          </Button>
        )}
      />
      <ConfigurationModal
        isOpen={isModalOpen}
        namespacesAvailable={namespaces || []}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (data) => {
          createSplitHorizonConfig({
            name: data.name,
            namespace: data.namespace,
            baseDomain: data.domain,
            caCrt: await fileToBase64(data.caCert!),
            tlsCrt: await fileToBase64(data.certificate!),
            tlsKey: await fileToBase64(data.key!),
            secretName: data.secretName,
          });
        }}
      />
    </>
  );
};

export default SplitHorizon;
