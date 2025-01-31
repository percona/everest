import { Box, Button } from '@mui/material';
import NorthEastIcon from '@mui/icons-material/NorthEast';

interface KnowMoreButtonProps {
  href: string;
}
const KnowMoreButton = ({ href }: KnowMoreButtonProps) => {
  return (
    <Box sx={{ display: 'inline-block', ml: 0.4 }}>
      <Button
        data-testid="know-more-button"
        size="small"
        variant="text"
        sx={{ display: 'flex' }}
        onClick={() => {
          window.open(href, '_blank', 'noopener');
        }}
        endIcon={<NorthEastIcon />}
      >
        Know more
      </Button>
    </Box>
  );
};

export default KnowMoreButton;
