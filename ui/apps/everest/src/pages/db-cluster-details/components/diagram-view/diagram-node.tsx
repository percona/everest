import { Paper, Stack } from '@mui/material';
import { Handle, Position } from '@xyflow/react';

const DiagramNode = ({
  height,
  width,
  children,
  elevation = 0,
  showTopHandle = false,
  showBottomHandle = false,
  dataTestId,
}: {
  height: number;
  width: number;
  children: React.ReactNode;
  elevation?: number;
  showTopHandle?: boolean;
  showBottomHandle?: boolean;
  dataTestId?: string;
}) => (
  <>
    {showTopHandle && (
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
    )}
    <Paper elevation={elevation} data-testid={dataTestId}>
      <Stack
        sx={{
          border: '1px solid',
          borderRadius: '4px',
          borderColor: 'divider',
          p: 2,
          height: `${height}px`,
          width: `${width}px`,
        }}
      >
        {children}
      </Stack>
    </Paper>
    {showBottomHandle && (
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    )}
  </>
);

export default DiagramNode;
