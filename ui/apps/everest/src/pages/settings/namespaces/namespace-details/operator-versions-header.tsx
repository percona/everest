import { Divider, Stack, Typography } from '@mui/material';
import { shortenOperatorName } from 'utils/db';
import { OperatorVersionsHeaderProps } from './types';

const Listing = ({
  items,
  upgradeable,
}: {
  items: Array<{ name: string; currentVersion: string }>;
  upgradeable?: boolean;
}) => (
  <>
    {items.map((item, idx) => (
      <>
        <Typography key={item.name} variant="body1" px={2}>
          {shortenOperatorName(item.name)} v{item.currentVersion}
          {upgradeable ? ' (Upgrade available)' : ''}
        </Typography>
        {idx < items.length - 1 && <Divider flexItem orientation="vertical" />}
      </>
    ))}
  </>
);

const OperatorVersionsHeader = ({
  operatorsUpgradePlan: { upgrades, upToDate },
}: OperatorVersionsHeaderProps) => (
  <Stack direction="row">
    <Listing items={upgrades} upgradeable />
    {upToDate.length > 0 && upgrades.length > 0 && (
      <Divider flexItem orientation="vertical" />
    )}
    <Listing items={upToDate} />
  </Stack>
);

export default OperatorVersionsHeader;
