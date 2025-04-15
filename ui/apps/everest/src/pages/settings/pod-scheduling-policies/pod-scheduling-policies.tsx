import Add from '@mui/icons-material/Add';
import { Button } from '@mui/material';
import { Table } from '@percona/ui-lib';

const PodSchedulingPolicies = () => {
  return (
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
          onClick={() => {}}
          sx={{ display: 'flex' }}
        >
          Create policy
        </Button>
      )}
    ></Table>
  );
};

export default PodSchedulingPolicies;
