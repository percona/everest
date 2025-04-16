import { useMatch } from 'react-router-dom';
import { SettingsTabs } from '../settings.types';
import PoliciesList from './policies-list/policies-list';

const PodSchedulingPolicies = () => {
  const routeMatch = useMatch(
    `/settings/${SettingsTabs.podSchedulingPolicies}/:name`
  );
  const isDetailsPage = !!routeMatch?.params.name;

  return isDetailsPage ? <></> : <PoliciesList />;
};

export default PodSchedulingPolicies;
