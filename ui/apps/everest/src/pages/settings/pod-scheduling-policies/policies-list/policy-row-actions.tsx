import { MenuItem } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import TableActionsMenu from 'components/table-actions-menu';
import { usePermissionsForResource } from 'hooks/rbac';
import { useNavigate } from 'react-router-dom';

type Props = {
  policyName: string;
  handleOnDeleteIconClick: () => void;
};

const PolicyRowActions = ({ policyName, handleOnDeleteIconClick }: Props) => {
  const { canDelete } = usePermissionsForResource(
    'pod-scheduling-policies',
    policyName
  );
  const navigate = useNavigate();

  return (
    <TableActionsMenu
      menuItems={[
        <MenuItem
          key="view"
          onClick={() =>
            navigate(`/settings/pod-scheduling-policies/${policyName}`)
          }
        >
          <Visibility sx={{ mr: 1 }} />
          View details
        </MenuItem>,
        canDelete ? (
          <MenuItem key="delete" onClick={handleOnDeleteIconClick}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        ) : null,
      ]}
    />
  );
};

export default PolicyRowActions;
