import { Box, Typography } from '@mui/material';
import {
  ComponentInput,
  PriorityToggle,
  TypeInput,
  WeightInput,
} from '../fields';

import { DbType } from '@percona/types';
import { availableComponentsType } from '../../../affinity-utils';

type Props = {
  dbType: DbType;
  disableComponent?: boolean;
  showWeight?: boolean;
};

const RuleTypeSection = ({ dbType, disableComponent, showWeight }: Props) => (
  <>
    <Typography variant="sectionHeading" sx={{ marginTop: '20px' }}>
      Rule type
    </Typography>
    <Box sx={{ display: 'flex', gap: '20px' }}>
      <ComponentInput
        disabled={!!disableComponent}
        dbType={dbType}
        components={availableComponentsType(dbType)}
      />
      <TypeInput />
      <PriorityToggle />
    </Box>
    {showWeight && <WeightInput />}
  </>
);

export default RuleTypeSection;
