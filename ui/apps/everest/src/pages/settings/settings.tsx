import { Box, Tab, Tabs } from '@mui/material';
import { Link, Navigate, Outlet, useMatch } from 'react-router-dom';

import { Messages } from './settings.messages';
import { SettingsTabs } from './settings.types';

export const Settings = () => {
  const routeMatch = useMatch('/settings/:tabs/:detail?');
  const currentTab = routeMatch?.params?.tabs;

  if (!currentTab) {
    return <Navigate to={SettingsTabs.storageLocations} replace />;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={currentTab}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="nav tabs"
        >
          {(Object.keys(SettingsTabs) as Array<keyof typeof SettingsTabs>).map(
            (item) => (
              <Tab
                label={Messages.tabs[item]}
                key={SettingsTabs[item]}
                value={SettingsTabs[item]}
                to={SettingsTabs[item]}
                component={Link}
              />
            )
          )}
        </Tabs>
      </Box>
      <Outlet />
    </Box>
  );
};
