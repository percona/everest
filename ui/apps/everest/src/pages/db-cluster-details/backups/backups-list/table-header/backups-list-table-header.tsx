import { useContext, useState } from 'react';
import { Box, Button, MenuItem } from '@mui/material';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowUpOutlined from '@mui/icons-material/KeyboardArrowUpOutlined';
import { MenuButton } from '@percona/ui-lib';
import { DbClusterStatus } from 'shared-types/dbCluster.types';
import { ScheduleModalContext } from '../../backups.context';
import ScheduledBackupsList from './scheduled-backups-list';
import { BackupListTableHeaderProps } from './backups-list-table-header.types';
import { Messages } from './backups-list-table-header.messages';

const BackupListTableHeader = ({
  onNowClick,
  onScheduleClick,
}: BackupListTableHeaderProps) => {
  const [showSchedules, setShowSchedules] = useState(false);
  const { dbCluster } = useContext(ScheduleModalContext);
  const schedulesNumber = dbCluster.spec.backup?.schedules?.length || 0;
  const restoring = dbCluster.status?.status === DbClusterStatus.restoring;

  const handleNowClick = (handleClose: () => void) => {
    onNowClick();
    handleClose();
  };

  const handleScheduleClick = (handleClose: () => void) => {
    onScheduleClick();
    handleClose();
  };

  const handleShowSchedules = () => {
    setShowSchedules((prev) => !prev);
  };

  return (
    <>
      <Box
        sx={(theme) => ({
          [theme.breakpoints.down('md')]: {
            width: '100%',
            order: 1,
          },
        })}
      >
        {/* Order is necessary to keep filters on the left side (i.e. filters have order=0) */}
        {schedulesNumber > 0 && (
          <Button
            size="small"
            data-testid="scheduled-backups"
            sx={{
              ml: 'auto',
              mr: 2,
              position: 'relative',
              ...(showSchedules && {
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: '-29px',
                  width: '0px',
                  height: '0px',
                  borderStyle: 'solid',
                  borderWidth: '0 14.5px 29px 14.5px',
                  borderColor: (theme) =>
                    `transparent transparent ${theme.palette.surfaces?.elevation0} transparent`,
                  transform: 'rotate(0deg)',
                },
              }),
            }}
            onClick={handleShowSchedules}
            endIcon={
              showSchedules ? (
                <KeyboardArrowUpOutlined />
              ) : (
                <KeyboardArrowDownOutlinedIcon />
              )
            }
          >
            {Messages.activeSchedules(schedulesNumber)}
          </Button>
        )}
        <MenuButton
          buttonProps={{
            disabled: restoring,
          }}
          buttonText="Create backup"
        >
          {(handleClose) => [
            <MenuItem
              key="now"
              data-testid="now-menu-item"
              onClick={() => handleNowClick(handleClose)}
            >
              {Messages.now}
            </MenuItem>,
            <Box key="schedule">
              <MenuItem
                onClick={() => handleScheduleClick(handleClose)}
                data-testid="schedule-menu-item"
              >
                {Messages.schedule}
              </MenuItem>
            </Box>,
          ]}
        </MenuButton>
      </Box>
      {schedulesNumber > 0 && showSchedules && <ScheduledBackupsList />}
    </>
  );
};

export default BackupListTableHeader;
