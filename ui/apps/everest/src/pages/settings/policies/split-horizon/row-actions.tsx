import { MenuItem } from '@mui/material';
import { useRBACPermissions } from 'hooks/rbac';
import DeleteIcon from '@mui/icons-material/Delete';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import TableActionsMenu from 'components/table-actions-menu';

const SplitHorizonRowActions = ({
  namespace,
  configName,
  handleOnDeleteIconClick,
  handleOnEditIconClick,
}: {
  namespace: string;
  configName: string;
  handleOnDeleteIconClick: () => void;
  handleOnEditIconClick: () => void;
}) => {
  const { canDelete, canUpdate } = useRBACPermissions(
    'enginefeatures/split-horizon-dns-configs',
    `${namespace}/${configName}`
  );

  const menuItems = [
    ...(canUpdate
      ? [
          <MenuItem key="edit" onClick={handleOnEditIconClick}>
            <EditOutlinedIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>,
        ]
      : []),
    ...(canDelete
      ? [
          <MenuItem key="delete" onClick={handleOnDeleteIconClick}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>,
        ]
      : []),
  ];

  return (
    <TableActionsMenu
      menuItems={menuItems}
      isVertical
      buttonColor="primary.main"
    />
  );
};

export default SplitHorizonRowActions;
