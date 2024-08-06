import { ReactNode } from 'react';
import { GridProps, TypographyProps } from '@mui/material';

export interface OverviewSectionRowProps {
  label: string;
  labelProps?: GridProps;
  contentString?: string;
  content?: ReactNode;
  contentProps?: TypographyProps;
}
