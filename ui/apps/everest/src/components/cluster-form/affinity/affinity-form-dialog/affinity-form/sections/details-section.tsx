import { Box, Typography } from '@mui/material';
import {
  KeyInput,
  OperatorInput,
  TopologyKeyInput,
  ValueInput,
} from '../fields';
import { AffinityOperator } from 'shared-types/affinity.types';

type Props = {
  disableOperator: boolean;
  disableValue: boolean;
  operator: AffinityOperator;
};

const RuleDetailsSection = ({
  operator,
  disableOperator,
  disableValue,
}: Props) => (
  <>
    <Typography variant="sectionHeading" sx={{ marginTop: '20px' }}>
      Rule details
    </Typography>
    <Box sx={{ display: 'flex', gap: '20px' }}>
      <TopologyKeyInput />
      <KeyInput />
      <OperatorInput disabled={disableOperator} />
    </Box>
    {[AffinityOperator.In, AffinityOperator.NotIn].includes(operator) && (
      <ValueInput disabled={disableValue} />
    )}
  </>
);

export default RuleDetailsSection;
