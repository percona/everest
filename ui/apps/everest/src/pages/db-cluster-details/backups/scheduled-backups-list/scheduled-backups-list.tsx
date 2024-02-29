// percona-everest-frontend
// Copyright (C) 2023 Percona LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useState, useContext } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { BorderColor, DeleteOutline } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DotsMenu } from 'components/dots-menu/dots-menu';
import { Option } from 'components/dots-menu/dots-menu.types';
import { getFormValuesFromCronExpression } from 'components/time-selection/time-selection.utils';
import {
  DB_CLUSTER_QUERY,
  useDbCluster,
} from 'hooks/api/db-cluster/useDbCluster';
import { getTimeSelectionPreviewMessage } from 'pages/database-form/database-preview/database.preview.messages';
import { Messages } from './scheduled-backups-list.messages';
import { ConfirmDialog } from 'components/confirm-dialog/confirm-dialog';
import { useDeleteSchedule } from 'hooks/api/backups/useScheduledBackups';
import { ScheduleModalContext } from '../backups.context.ts';

export const ScheduledBackupsList = () => {
  const { dbClusterName, namespace = '' } = useParams();
  const queryClient = useQueryClient();

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const {
    setMode: setScheduleModalMode,
    setSelectedScheduleName: setSelectedScheduleToModalContext,
    setOpenScheduleModal,
  } = useContext(ScheduleModalContext);
  const { data } = useDbCluster(dbClusterName!, namespace, {
    enabled: !!dbClusterName,
    refetchInterval: 10 * 1000,
  });
  const { mutate: deleteSchedule, isPending: deletingSchedule } =
    useDeleteSchedule(dbClusterName!, namespace);
  const schedules = data && data?.spec?.backup?.schedules;
  const handleDelete = (scheduleName: string) => () => {
    setSelectedSchedule(scheduleName);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleConfirmDelete = (scheduleName: string) => {
    deleteSchedule(scheduleName, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [DB_CLUSTER_QUERY, dbClusterName],
        });
        handleCloseDeleteDialog();
      },
    });
  };

  const handleEdit = (scheduleName: string) => () => {
    if (setScheduleModalMode) {
      setScheduleModalMode('edit');
    }
    if (setSelectedScheduleToModalContext) {
      setSelectedScheduleToModalContext(scheduleName);
    }
    if (setOpenScheduleModal) {
      setOpenScheduleModal(true);
    }
  };

  const options: (scheduleName: string) => Option[] = (scheduleName) => [
    {
      key: 'edit',
      onClick: handleEdit(scheduleName),
      children: Messages.menuItems.edit,
      icon: BorderColor,
    },
    {
      key: 'delete',
      onClick: handleDelete(scheduleName),
      children: Messages.menuItems.delete,
      icon: DeleteOutline,
    },
  ];

  return (
    <>
      {schedules && schedules?.length > 0 && (
        <Accordion sx={{ mt: 1 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="scheduled-backups-content"
            data-testid="scheduled-backups"
          >
            <Typography variant="body1">
              {schedules
                ? Messages.sectionHeader(schedules?.length)
                : Messages.noSchedules}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack useFlexGap spacing={1}>
              {schedules &&
                schedules.map((item) => (
                  <Paper
                    key={`schedule-${item?.name}`}
                    sx={{ py: 1, px: 2, borderRadius: 0 }}
                    data-testid={`schedule-${item?.schedule}`}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ width: '65%' }}>
                        {' '}
                        <Typography variant="subHead2">
                          {getTimeSelectionPreviewMessage(
                            getFormValuesFromCronExpression(item.schedule)
                          )}
                        </Typography>
                      </Box>
                      <Box sx={{ width: '30%' }}>
                        {item?.retentionCopies
                          ? `Retention copies: ${item.retentionCopies}`
                          : '-'}
                      </Box>
                      <Box
                        sx={{
                          width: '5%',
                          justifyContent: 'flex-end',
                          display: 'flex',
                        }}
                        data-testid="schedule-dots-menu"
                      >
                        <DotsMenu
                          options={options(item?.name)}
                          iconButtonProps={{
                            disabled: !data?.spec?.backup?.enabled,
                          }}
                        />
                      </Box>
                    </Box>
                  </Paper>
                ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}
      {openDeleteDialog && (
        <ConfirmDialog
          isOpen={openDeleteDialog}
          selectedId={selectedSchedule}
          closeModal={handleCloseDeleteDialog}
          headerMessage={Messages.deleteModal.header}
          handleConfirm={handleConfirmDelete}
          disabledButtons={deletingSchedule}
        >
          {Messages.deleteModal.content(selectedSchedule)}
        </ConfirmDialog>
      )}
    </>
  );
};
