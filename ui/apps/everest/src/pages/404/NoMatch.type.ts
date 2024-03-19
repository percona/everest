import { FC } from 'react';

export type NoMatchProps = {
  header?: string;
  subHeader?: string;
  redirectButtonText?: string;
  CustomIcon?: FC<{ w: string; h: string }>;
};
