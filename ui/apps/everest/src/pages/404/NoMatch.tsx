import { Box, Button, Typography } from '@mui/material';
import { NoMatchIcon } from '@percona/ui-lib';
import { useActiveBreakpoint } from 'hooks/utils/useActiveBreakpoint';
import { Link } from 'react-router-dom';
import { Messages } from './NoMatch.messages';
import { NoMatchProps } from './NoMatch.type';

export const NoMatch = ({
  header = Messages.header,
  subHeader = Messages.subHeader,
  redirectButtonText = Messages.redirectButton,
  CustomIcon,
  onButtonClick,
}: NoMatchProps) => {
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
        {CustomIcon ? (
          <CustomIcon
            w={isMobile ? '300px' : '435px'}
            h={isMobile ? '300px' : '435px'}
          />
        ) : (
          <NoMatchIcon
            w={isMobile ? '300px' : '435px'}
            h={isMobile ? '300px' : '435px'}
          />
        )}
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
          {header}
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
          {subHeader}
        </Typography>
        <Button
          component={Link}
          to="/"
          sx={{ alignSelf: 'start', mt: 2 }}
          variant="contained"
          data-testid="no-match-button"
          onClick={onButtonClick}
        >
          {redirectButtonText}
        </Button>
      </Box>
    </Box>
  );
};
