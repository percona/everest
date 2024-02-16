import { LoadableChildrenProps } from '@percona/ui-lib';

export type OverviewSectionProps = {
  title: string;
  dataTestId?: string;
} & LoadableChildrenProps;

export type OverviewSectionTextProps = {
  children: React.ReactNode;
  dataTestId?: string;
};
