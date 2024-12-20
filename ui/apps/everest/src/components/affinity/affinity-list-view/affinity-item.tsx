import { Stack, Typography } from '@mui/material';
import { AffinityRule } from 'components/cluster-form/advanced-configuration/advanced-configuration.types';

const showRuleProperty = (prop: string | undefined) => {
  return prop ? ` | ${prop}` : '';
};

export const AffinityItem = ({ rule }: { rule: AffinityRule }) => {
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        width: '100%',
      }}
    >
      <Stack
        sx={{
          width: '50%',
        }}
      >
        <Typography variant="body1">
          {rule.type}
          {[rule.topologyKey, rule.key, rule.operator, rule.values].map(
            (prop) => showRuleProperty(prop)
          )}
        </Typography>
      </Stack>
    </Stack>
  );
};
