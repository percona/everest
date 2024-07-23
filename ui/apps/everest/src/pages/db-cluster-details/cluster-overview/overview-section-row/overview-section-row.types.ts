import { ReactNode } from 'react';
import { GridProps } from '@mui/material';

export interface OverviewSectionRowProps {
  label: string;
  labelProps?: GridProps;
  contentString?: string;
  content?: ReactNode;
}
