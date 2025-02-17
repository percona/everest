import { ReactNode } from 'react';
import { GridProps, TypographyProps } from '@mui/material';

export interface OverviewSectionRowProps {
  label: string;
  labelProps?: GridProps;
  contentString?: ReactNode;
  content?: ReactNode;
  contentProps?: TypographyProps;
  dataTestId?: string;
}
