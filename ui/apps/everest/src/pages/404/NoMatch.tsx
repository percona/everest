import { Box, Button, Typography } from '@mui/material';
import { NoMatchIcon } from '@percona/ui-lib';
import { Link } from 'react-router-dom';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import { Messages } from './NoMatch.messages';

export const NoMatch = () => {
  const { isMobile, isTablet, isDesktop } = useActiveBreakpoint();

  return (
    <Box
      sx={{
        height: isDesktop ? '435px' : 'auto',
        width: isDesktop ? '980px' : 'auto',
        mt: isTablet ? '58px' : isMobile ? '13px' : '150px',
        mx: isTablet ? '58px' : isMobile ? '13px' : 'auto',
        display: 'flex',
        flexDirection: isDesktop ? 'row' : 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Box>
        <NoMatchIcon
          w={isMobile ? '300px' : '435px'}
          h={isMobile ? '300px' : '435px'}
        />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '40px',
            lineHeight: '40px',
            letterSpacing: '-0.025em',
            fontFamily:
              '"Poppins", "Roboto", "Helvetica", "Arial", "sans-serif"',
          }}
        >
          {Messages.header}
        </Typography>
        <Typography
          sx={{
            fontWeight: 400,
            fontSize: '16px',
            lineHeight: '19.44px',
            letterSpacing: '-0.025em',
            fontFamily:
              '"Poppins", "Roboto", "Helvetica", "Arial", "sans-serif"',
          }}
        >
          {Messages.subHeader}
        </Typography>
        <Button
          component={Link}
          to="/"
          sx={{ alignSelf: 'start', mt: 2 }}
          variant="contained"
          data-testid="no-match-button"
        >
          {Messages.redirectButton}
        </Button>
      </Box>
    </Box>
  );
};
