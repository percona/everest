import { Box, Typography } from '@mui/material';
import {
  ComponentInput,
  PriorityToggle,
  TypeInput,
  WeightInput,
} from '../fields';
import { availableComponentsType } from 'components/cluster-form/affinity/affinity-utils';
import { DbType } from '@percona/types';

type Props = {
  dbType: DbType;
  isShardingEnabled: boolean;
  disableComponent: boolean;
  showWeight?: boolean;
};

const RuleTypeSection = ({
  dbType,
  isShardingEnabled,
  disableComponent,
  showWeight,
}: Props) => (
  <>
    <Typography variant="sectionHeading" sx={{ marginTop: '20px' }}>
      Rule type
    </Typography>
    <Box sx={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
      <ComponentInput
        disabled={disableComponent}
        components={availableComponentsType(dbType, isShardingEnabled)}
      />
      <TypeInput />
      <PriorityToggle />
    </Box>
    {showWeight && <WeightInput />}
  </>
);

export default RuleTypeSection;
