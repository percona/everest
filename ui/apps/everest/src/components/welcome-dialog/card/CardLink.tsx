import { Card, CardContent, SvgIcon, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const CardLink = ({
  Icon,
  action,
  description,
  link,
  handleCloseModal,
}: {
  Icon: typeof SvgIcon;
  action: string;
  description: string;
  link: string;
  handleCloseModal: () => void;
}) => {
  const navigate = useNavigate();
  const handleRedirect = () => {
    handleCloseModal();
    navigate(link);
  };
  return (
    <Card
      sx={{
        width: '334px',
        height: '188px',
        boxShadow: 3,
        ':hover': {
          cursor: 'pointer',
        },
      }}
      onClick={handleRedirect}
    >
      <CardContent
        sx={{
          py: 3,
          px: 4,
        }}
      >
        <Icon
          fontSize="inherit"
          // This is hack to make those icons thinner
          sx={{ fontSize: '58px', stroke: '#ffffff', strokeWidth: 1 }}
        />
        <Typography variant="h6">{action}</Typography>
        <Typography variant="helperText">{description}</Typography>
      </CardContent>
    </Card>
  );
};
