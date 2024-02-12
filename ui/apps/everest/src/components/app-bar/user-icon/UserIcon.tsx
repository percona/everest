import { useContext, useState } from 'react';
import {
  FormControlLabel,
  FormGroup,
  IconButton,
  Menu,
  MenuItem,
  Switch,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { ColorModeContext } from '@percona/design';
import { AuthContext } from 'contexts/auth';

const AppBarUserIcon = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { colorMode, toggleColorMode } = useContext(ColorModeContext);
  const { logout } = useContext(AuthContext);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton
        size="medium"
        aria-label="user"
        aria-controls="menu-user"
        aria-haspopup="true"
        onClick={handleMenu}
        sx={{ color: 'text.secondary' }}
        data-testid="user-appbar-button"
      >
        <PersonOutlineIcon />
      </IconButton>
      <Menu
        id="menu-user"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={colorMode === 'dark'}
                  onChange={toggleColorMode}
                />
              }
              label="Dark mode"
              labelPlacement="start"
              sx={{
                ml: 0,
              }}
            />
          </FormGroup>
        </MenuItem>
        <MenuItem onClick={logout}>Log out</MenuItem>
      </Menu>
    </>
  );
};

export default AppBarUserIcon;
