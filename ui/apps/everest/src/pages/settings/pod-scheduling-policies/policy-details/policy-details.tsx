import {
  Box,
  Button,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Edit from '@mui/icons-material/Edit';
import { SettingsTabs } from 'pages/settings/settings.types';
import { useNavigate, useParams } from 'react-router-dom';
import { usePodSchedulingPolicy } from 'hooks';
import { NoMatch } from 'pages/404/NoMatch';
import { Table } from '@percona/ui-lib';
import EmptyState from 'components/empty-state';
import { useState } from 'react';
import { AffinityFormDialog } from '../affinity/affinity-form-dialog/affinity-form-dialog';
import { DbType } from '@percona/types';

const PolicyDetails = () => {
  const navigate = useNavigate();
  const { name: policyName = '' } = useParams();
  const [openAffinityDialog, setOpenAffinityDialog] = useState(false);

  const {
    isLoading,
    isError,
    data: policy,
  } = usePodSchedulingPolicy(policyName);

  if (isLoading) {
    return (
      <>
        <Skeleton variant="rectangular" />
        <Skeleton variant="rectangular" />
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <Skeleton variant="rectangular" />
      </>
    );
  }

  if (isError) {
    return <NoMatch />;
  }

  return (
    <>
      <Button
        sx={{ mt: 2 }}
        startIcon={<ArrowBack />}
        onClick={() =>
          navigate(`/settings/${SettingsTabs.podSchedulingPolicies}`)
        }
      >
        Back
      </Button>
      <Box display="flex" alignItems="center" gap={1} mt={3} mb={2}>
        <Typography variant="h6">{policyName} / MySQL</Typography>
        <IconButton
          size="medium"
          aria-label="edit"
          onClick={() => {}}
          data-testid="edit-policy-button"
          sx={{
            position: 'relative',
            bottom: '2px',
          }}
        >
          <Edit />
        </IconButton>
      </Box>
      <Table
        tableName="policy-rules"
        data={[]}
        columns={[]}
        emptyState={
          <EmptyState
            onButtonClick={() => setOpenAffinityDialog(true)}
            buttonText="Add rule"
            contentSlot={
              <Stack alignItems="center">
                <Typography variant="body1">
                  You currently do not have any rules in this policy.
                </Typography>
                <Typography variant="body1">
                  Create one to get started.
                </Typography>
              </Stack>
            }
          />
        }
      />
      <AffinityFormDialog
        isOpen={openAffinityDialog}
        dbType={DbType.Postresql}
        handleClose={() => setOpenAffinityDialog(false)}
      />
    </>
  );
};

export default PolicyDetails;
