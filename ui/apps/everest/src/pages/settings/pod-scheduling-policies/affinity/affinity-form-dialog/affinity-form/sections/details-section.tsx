import { Box, Typography } from '@mui/material';
import {
  KeyInput,
  OperatorInput,
  TopologyKeyInput,
  ValueInput,
} from '../fields';
import { AffinityOperator, AffinityType } from 'shared-types/affinity.types';
import { doesAffinityOperatorRequireValues } from 'utils/db';

type Props = {
  disableOperator: boolean;
  disableValue: boolean;
  operator: AffinityOperator;
  showTopologyKey: boolean;
  affinityType: AffinityType;
};

const RuleDetailsSection = ({
  operator,
  disableOperator,
  disableValue,
  showTopologyKey,
  affinityType,
}: Props) => (
  <>
    <Typography variant="sectionHeading" sx={{ marginTop: '20px' }}>
      Rule details
    </Typography>
    <Box sx={{ display: 'flex', gap: '20px' }}>
      {showTopologyKey && <TopologyKeyInput />}
      <KeyInput affinityType={affinityType} />
      <OperatorInput disabled={disableOperator} />
    </Box>
    {doesAffinityOperatorRequireValues(operator) && (
      <ValueInput disabled={disableValue} />
    )}
  </>
);

export default RuleDetailsSection;
