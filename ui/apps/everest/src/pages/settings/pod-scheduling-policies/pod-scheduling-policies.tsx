import { useState } from 'react';
import Add from '@mui/icons-material/Add';
import { Button } from '@mui/material';
import { Table } from '@percona/ui-lib';
import PoliciesDialog from './policies-dialog';

const PodSchedulingPolicies = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Table
        tableName="pod-scheduling-policies"
        noDataMessage="No pod scheduling policies added"
        data={[]}
        columns={[]}
        renderTopToolbarCustomActions={() => (
          // TODO check if user has permission to create
          <Button
            size="small"
            startIcon={<Add />}
            data-testid="add-policy"
            variant="outlined"
            onClick={() => setDialogOpen(true)}
            sx={{ display: 'flex' }}
          >
            Create policy
          </Button>
        )}
      />
      <PoliciesDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
};

export default PodSchedulingPolicies;
