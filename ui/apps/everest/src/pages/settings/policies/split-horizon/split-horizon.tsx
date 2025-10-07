import { Add } from '@mui/icons-material';
import { Button } from '@mui/material';
import { Table } from '@percona/ui-lib';
import { useMemo } from 'react';

const SplitHorizon = () => {
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
    () => [
      {
        domain: 'domain',
      },
      {
        domain: 'domain',
      },
      {
        domain: 'domain',
      },
      {
        domain: 'domain',
      },
    ],
    []
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
