import type { Meta, StoryObj } from '@storybook/react';
import {
  Box,
  Divider,
  Stack,
  Typography,
  TypographyProps,
} from '@mui/material';
import { TYPOGRAPHY } from './Typography.data';

const itemTitleStyles = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#2C323E66',
  lineHeight: '20px',
  textAlign: 'right',
  align: 'right',
};
const boxItemStyles = {
  width: '1040px',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'baseline',
  gap: '80px',
  padding: '24px 40px 24px 0',
};
const mainBoxStyles = {
  border: '1px solid #2C323E40',
  boxSizing: 'border-box',
  width: '1120px',
  padding: '40px',
  borderRadius: '16px',
};
const mainTitleStyles = {
  fontWeight: '700',
  fontSize: '20px',
  marginBottom: '40px',
  color: '#2C323E',
};

const textBoxStyles = {
  boxSizing: 'border-box',
  width: '156px',
  flexShrink: '0',
};

const meta = {
  title: 'Typography',
  component: Typography,
  parameters: {
    layout: 'centered',
  },
  render: function Render() {
    return (
      <Box>
        {Object.keys(TYPOGRAPHY).map((key) => (
          <Box key={key} my="80px">
            <Typography sx={mainTitleStyles}>{key}</Typography>
            <Box sx={mainBoxStyles}>
              <Stack divider={<Divider orientation="horizontal" flexItem />}>
                {TYPOGRAPHY[key].map((item) => (
                  <Box sx={boxItemStyles} key={`${item.variant}_${key}`}>
                    <Box sx={textBoxStyles}>
                      <Typography sx={itemTitleStyles}>
                        {item.title.toUpperCase()}
                      </Typography>
                    </Box>
                    <Typography
                      // @ts-ignore
                      variant={item.variant}
                      style={{ ...item.style }}
                    >
                      {item.text}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        ))}
      </Box>
    );
  },
} satisfies Meta<TypographyProps>;

export default meta;
type Story = StoryObj<TypographyProps>;

export const MainScale: Story = {};
