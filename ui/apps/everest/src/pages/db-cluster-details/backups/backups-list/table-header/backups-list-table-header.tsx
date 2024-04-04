import { useContext, useState } from 'react';
import { Button, MenuItem } from '@mui/material';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowUpOutlined from '@mui/icons-material/KeyboardArrowUpOutlined';
import { MenuButton } from '@percona/ui-lib';
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
      {/* Order is necessary to keep filters on the left side (i.e. filters have order=0) */}
      {schedulesNumber > 0 && (
        <Button
          size="small"
          sx={{ ml: 'auto', mr: 2, order: 1 }}
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
      <MenuButton buttonProps={{ sx: { order: 2 } }} buttonText="Create backup">
        {(handleClose) => [
          <MenuItem
            key="now"
            data-testid="now-menu-item"
            onClick={() => handleNowClick(handleClose)}
          >
            {Messages.now}
          </MenuItem>,
          <MenuItem
            key="schedule"
            data-testid="schedule-menu-item"
            onClick={() => handleScheduleClick(handleClose)}
          >
            {Messages.schedule}
          </MenuItem>,
        ]}
      </MenuButton>
      {schedulesNumber > 0 && showSchedules && <ScheduledBackupsList />}
    </>
  );
};

export default BackupListTableHeader;
