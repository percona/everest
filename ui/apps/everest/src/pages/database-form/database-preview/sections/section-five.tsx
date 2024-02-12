import { PreviewContentText } from '../preview-section';
import { SectionProps } from './section.types';

export const PreviewSectionFive = ({ monitoring }: SectionProps) => (
  <PreviewContentText text={monitoring ? 'Enabled' : 'Disabled'} />
);
