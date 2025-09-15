import { MenuItem, MenuItemProps } from '@mui/material';

const EmptyMenuItem = (props: MenuItemProps) => {
  return (
    <MenuItem value="" {...props}>
      <em>None</em>
    </MenuItem>
  );
};

export default EmptyMenuItem;
