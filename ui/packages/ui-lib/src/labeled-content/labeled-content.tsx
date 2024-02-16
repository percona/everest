import { Typography } from '@mui/material';
import { LabeledContentProps } from './labeled-content.types';

const LabeledContent = ({
  label,
  children,
  isRequired = false,
  sx,
  ...typographyProps
}: LabeledContentProps) => (
  <>
    <Typography
      // @ts-ignore
      variant="sectionHeading"
      sx={{ mt: 4, mb: 0.5, ...sx }}
      {...typographyProps}
    >
      {label}
      {isRequired && <span>*</span>}
    </Typography>
    {children}
  </>
);

export default LabeledContent;
