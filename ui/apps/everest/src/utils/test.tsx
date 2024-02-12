/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import mediaQuery from 'css-mediaquery';
import { MemoryRouter } from 'react-router-dom';
import { ThemeContextProvider, everestThemeOptions } from '@percona/design';

export const createMatchMedia = (width: number) => {
  return (query: string) => {
    return {
      matches: mediaQuery.match(query, { width }),
      media: '',
      addListener: () => {},
      removeListener: () => {},
      onchange: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    };
  };
};

export const resizeScreenSize = (width: number) => {
  window.matchMedia = createMatchMedia(width);
};

export const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <ThemeContextProvider themeOptions={everestThemeOptions}>
      {children}
    </ThemeContextProvider>
  </MemoryRouter>
);
