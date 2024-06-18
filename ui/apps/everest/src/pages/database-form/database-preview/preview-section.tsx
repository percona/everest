import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { IconButton, Stack, Typography, useTheme } from '@mui/material';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import {
  PreviewContentTextProps,
  PreviewSectionProps,
} from './database-preview.types';
import { kebabize } from '@percona/utils';

export const PreviewSection = ({
  title,
  order,
  onEditClick,
  children,
  hasBeenReached = false,
  active = false,
  disabled = false,
  sx,
  ...stackProps
}: PreviewSectionProps) => {
  const theme = useTheme();
  const showEdit = !active && hasBeenReached && !disabled;
  const { isDesktop } = useActiveBreakpoint();

  return (
    <Stack
      data-testid={`section-${title}`}
      sx={{
        pl: 3,
        pt: 1,
        pb: 1,
        pr: 1,
        ...(!hasBeenReached &&
          !active && {
            pt: 0,
            pb: 0,
          }),
        ...(active &&
          isDesktop && {
            backgroundColor: 'action.hover',
            mb: 1.5,
          }),
        ...sx,
      }}
      {...stackProps}
    >
      <Typography
        variant={hasBeenReached ? 'sectionHeading' : 'caption'}
        color={hasBeenReached ? 'text.primary' : 'text.disabled'}
        sx={{
          position: 'relative',
          ml: -2,
        }}
      >
        {`${order}. ${title}`}
        {showEdit && (
          <IconButton
            // Absolute position to avoid the button's padding from interfering with the spacing
            sx={{
              position: 'absolute',
              top: theme.spacing(-1),
            }}
            color="primary"
            disabled={disabled}
            onClick={onEditClick}
            data-testid={`button-edit-preview-${kebabize(
              title.replace(/\s/g, '')
            )}`}
          >
            <EditOutlinedIcon
              fontSize="small"
              sx={{
                verticalAlign: 'text-bottom',
              }}
              data-testid={`edit-section-${order}`}
            />
          </IconButton>
        )}
      </Typography>
      {hasBeenReached && children}
    </Stack>
  );
};

export const PreviewContentText = ({
  text,
  dataTestId,
}: PreviewContentTextProps) => (
  <Typography
    variant="caption"
    color="text.secondary"
    data-testid={
      dataTestId ? `${dataTestId}-preview-content` : 'preview-content'
    }
  >
    {text}
  </Typography>
);
