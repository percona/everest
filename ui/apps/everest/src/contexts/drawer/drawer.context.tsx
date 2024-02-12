import React, { createContext, useState } from 'react';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import { DrawerContextProps } from './drawer.context.types';

export const DrawerContext = createContext<DrawerContextProps>({
  open: false,
  toggleOpen: () => {},
  setOpen: () => {},
  activeBreakpoint: 'desktop',
});

export const DrawerContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggleOpen = () => setDrawerOpen((val) => !val);

  const { activeBreakpoint } = useActiveBreakpoint();

  return (
    <DrawerContext.Provider
      value={{
        open: drawerOpen,
        toggleOpen,
        activeBreakpoint,
        setOpen: setDrawerOpen,
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
};
