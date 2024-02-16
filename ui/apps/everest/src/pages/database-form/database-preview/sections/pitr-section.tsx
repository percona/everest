import { PreviewContentText } from '../preview-section';
import { PITRStepType } from '../../database-form-schema';

export const PITRSection = ({ pitrEnabled }: PITRStepType) => (
  <>
    <PreviewContentText text={pitrEnabled ? 'Enabled' : 'Disabled'} />
  </>
);
