import { Table } from '@percona/ui-lib';
import { useEffect, useMemo, useState } from 'react';
import {
  AnnotationType,
  LoadBalancerConfig,
} from 'shared-types/loadbalancer.types';

interface LoadBalancerTableProps {
  config: LoadBalancerConfig;
}

const LoadBalancerTable = ({ config }: LoadBalancerTableProps) => {
  const [annotations, setAnnotations] = useState<AnnotationType[]>([]);
  const entries = useMemo(
    () => Object.entries(config?.spec.annotations || {}),
    [config]
  );

  useEffect(() => {
    setAnnotations(entries.map(([key, value]) => ({ key, value })));
  }, [entries]);

  const columns = useMemo(
    () => [
      {
        header: 'Key',
        accessorKey: 'key',
      },
      {
        header: 'Value',
        accessorKey: 'value',
      },
    ],
    []
  );

  return <Table tableName="annotations" columns={columns} data={annotations} />;
};

export default LoadBalancerTable;
