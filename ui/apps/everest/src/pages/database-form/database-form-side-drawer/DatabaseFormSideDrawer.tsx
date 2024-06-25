import { useMemo } from 'react';
import { Divider, Drawer, Toolbar, useTheme } from '@mui/material';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import { DatabasePreview } from '../database-preview/database-preview';
import { DatabaseFormSideDrawerProps } from './DatabaseFormSideDrawer.types';

const DatabaseFormSideDrawer = ({
  activeStep,
  longestAchievedStep,
  handleSectionEdit,
  disabled,
}: DatabaseFormSideDrawerProps) => {
  const theme = useTheme();
  const { isDesktop } = useActiveBreakpoint();

  const PreviewContent = useMemo(
    () => (
      <DatabasePreview
        disabled={disabled}
        activeStep={activeStep}
        longestAchievedStep={longestAchievedStep}
        onSectionEdit={handleSectionEdit}
        sx={{
          mt: 2,
          ...(!isDesktop && {
            padding: 0,
          }),
        }}
      />
    ),
    [activeStep, longestAchievedStep, handleSectionEdit, isDesktop]
  );

  if (isDesktop) {
    return (
      <Drawer
        variant="permanent"
        anchor="right"
        sx={{
          // MuiDrawer-paper will take 25% of the whole screen because it has a "fixed" positioning
          // Hence, we must use vw here to have the same calculation
          // We subtract the padding
          width: (theme) => `calc(25vw - ${theme.spacing(4)})`,
          flexShrink: 0,
          ml: 3,
          [`& .MuiDrawer-paper`]: {
            width: '25%',
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        {PreviewContent}
      </Drawer>
    );
  }

  return (
    <>
      <Divider
        orientation="horizontal"
        flexItem
        sx={{
          // This is a little tweak
          // We make the divider longer, adding the main padding value
          // Then, to make it begin before the main padding, we add a negative margin
          // This way, the divider will cross the whole section
          width: `calc(100% + ${theme.spacing(4 * 2)})`,
          ml: -4,
          mt: 6,
        }}
      />
      {PreviewContent}
    </>
  );
};

export default DatabaseFormSideDrawer;
