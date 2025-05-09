import { Outlet, useMatch } from 'react-router-dom';
import { SettingsTabs } from '../settings.types';
import PoliciesList from './policies-list';

const PodSchedulingPolicies = () => {
  const routeMatch = useMatch(
    `/settings/${SettingsTabs.podSchedulingPolicies}/:name`
  );
  const isDetailsPage = !!routeMatch?.params.name;

  return isDetailsPage ? <Outlet /> : <PoliciesList />;
};

export default PodSchedulingPolicies;
