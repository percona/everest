import React, { useMemo } from 'react';
import type { Preview } from '@storybook/react';
import { CssBaseline, createTheme, ThemeProvider } from '@mui/material';
import { everestThemeOptions } from '@percona/design';

const preview: Preview = {
  decorators: [
    (Story, context) => {
      const {
        globals: { mode },
      } = context;

      const theme = useMemo(
        () => createTheme(everestThemeOptions(mode)),
        [mode]
      );

      document.body.style.backgroundColor = theme.palette.background.default;

      return (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Story />
        </ThemeProvider>
      );
    },
  ],
  globalTypes: {
    mode: {
      name: 'mode',
      description: 'Color mode',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'circlehollow', title: 'light' },
          { value: 'dark', icon: 'circle', title: 'dark' },
        ],
        showName: true,
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
