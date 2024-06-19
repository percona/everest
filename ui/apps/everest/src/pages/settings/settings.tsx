import { Box, Tab, Tabs } from '@mui/material';
import { Link, Navigate, Outlet, useMatch } from 'react-router-dom';

import { Messages } from './settings.messages';
import { SettingsTabs } from './settings.types';

export const Settings = () => {
  const routeMatch = useMatch('/settings/:tabs');
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
          {Object.keys(SettingsTabs).map((item) => (
            <Tab
              // @ts-ignore
              label={Messages[item]}
              // @ts-ignore
              key={SettingsTabs[item]}
              // @ts-ignore
              value={SettingsTabs[item]}
              // @ts-ignore
              to={SettingsTabs[item]}
              component={Link}
            />
          ))}
        </Tabs>
      </Box>
      <Outlet />
    </Box>
  );
};
