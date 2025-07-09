import { Alert, Box, Button, Typography } from '@mui/material';
import { StatusCondition } from 'shared-types/dbCluster.types';
import { humanizeDbError } from './constants';
import { useState } from 'react';
import { DbErrorDialog } from './db-error-dialog';
import { Messages } from './messages';

export const DbErrors = ({ conditions }: { conditions: StatusCondition[] }) => {
  const [openDialog, setOpenDialog] = useState(false);

  return (
    <>
      {conditions.map((condition) => {
        const humanizedDbError = humanizeDbError(condition.type);
        return (
          humanizedDbError && (
            <Box>
              <Alert
                severity="error"
                sx={{
                  width: '100%',
                  height: 'auto',
                  marginTop: 1,
                  marginBottom: 1,
                  alignItems: 'center',
                }}
                action={
                  <Button
                    sx={{ color: 'error.contrastText' }}
                    size="small"
                    onClick={() => setOpenDialog(true)}
                  >
                    {Messages.errorDetails}
                  </Button>
                }
              >
                <Typography>{humanizedDbError}</Typography>
              </Alert>

              <DbErrorDialog
                title={Messages.errorDetails}
                content={condition.message}
                open={openDialog}
                onClose={() => setOpenDialog(false)}
              />
            </Box>
          )
        );
      })}
    </>
  );
};
