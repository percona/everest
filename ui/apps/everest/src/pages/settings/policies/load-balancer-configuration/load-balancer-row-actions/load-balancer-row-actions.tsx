import { Visibility } from '@mui/icons-material';
import { MenuItem } from '@mui/material';
import TableActionsMenu from 'components/table-actions-menu';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import { messages } from '../load-balancer.messages';

interface LoadBalancerRowActionsProps {
  configName: string;
  handleOnDeleteIconClick: () => void;
}

const LoadBalancerRowActions = ({
  configName,
  handleOnDeleteIconClick,
}: LoadBalancerRowActionsProps) => {
  const navigate = useNavigate();
  return (
    <TableActionsMenu
      menuItems={[
        <MenuItem
          key="view"
          onClick={() =>
            navigate(
              `/settings/policies/load-balancer-configuration/${configName}`
            )
          }
        >
          <Visibility sx={{ mr: 1 }} />
          {messages.rowActions.viewDetails}
        </MenuItem>,
        <MenuItem key="delete" onClick={handleOnDeleteIconClick}>
          <DeleteIcon sx={{ mr: 1 }} />
          {messages.rowActions.delete}
        </MenuItem>,
      ]}
      isVertical
      buttonColor="primary.main"
    />
  );
};

export default LoadBalancerRowActions;
