import { useContext, useState } from 'react';
import { Box, Button, MenuItem, Tooltip } from '@mui/material';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowUpOutlined from '@mui/icons-material/KeyboardArrowUpOutlined';
import { MenuButton } from '@percona/ui-lib';
import { DbEngineType } from '@percona/types';
import { DbClusterStatus } from 'shared-types/dbCluster.types';
import { ScheduleModalContext } from '../../backups.context';
import ScheduledBackupsList from './scheduled-backups-list';
import { BackupListTableHeaderProps } from './backups-list-table-header.types';
import { Messages } from './backups-list-table-header.messages';
import styles from './backups-list-table-header.module.css';

const BackupListTableHeader = ({
  onNowClick,
  onScheduleClick,
}: BackupListTableHeaderProps) => {
  const [showSchedules, setShowSchedules] = useState(false);
  const { dbCluster } = useContext(ScheduleModalContext);
  const schedulesNumber = dbCluster.spec.backup?.schedules?.length || 0;
  const restoring = dbCluster.status?.status === DbClusterStatus.restoring;
  const disableScheduleBackups =
    dbCluster?.spec.engine.type === DbEngineType.POSTGRESQL &&
    dbCluster?.spec.backup?.schedules &&
    dbCluster?.spec.backup?.schedules.length >= 3;

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
            sx={{
              ml: 'auto',
              mr: 2,
              position: 'relative',
            }}
            className={showSchedules ? styles.scheduleToggleButton : ''}
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
              {disableScheduleBackups ? (
                <Tooltip
                  title={Messages.exceededScheduleBackupsNumber}
                  placement="right"
                  arrow
                >
                  <div>
                    <MenuItem data-testid="schedule-menu-item" disabled>
                      {Messages.schedule}
                    </MenuItem>
                  </div>
                </Tooltip>
              ) : (
                <MenuItem
                  onClick={() => handleScheduleClick(handleClose)}
                  data-testid="schedule-menu-item"
                >
                  {Messages.schedule}
                </MenuItem>
              )}
            </Box>,
          ]}
        </MenuButton>
      </Box>
      {schedulesNumber > 0 && showSchedules && <ScheduledBackupsList />}
    </>
  );
};

export default BackupListTableHeader;
