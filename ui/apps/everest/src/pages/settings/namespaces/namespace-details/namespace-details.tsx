import BackNavigationText from 'components/back-navigation-text';
import { useNamespace } from 'hooks/api/namespaces';
import { useNavigate, useParams } from 'react-router-dom';
import { NoMatch } from 'pages/404/NoMatch';

const NamespaceDetails = () => {
  const navigate = useNavigate();
  const { namespace: namespaceName = '' } = useParams();
  const { data: namespace, isLoading: loadingNamespace } = useNamespace(
    namespaceName,
    {
      enabled: !!namespaceName,
    }
  );

  if (loadingNamespace) {
    return null;
  }

  if (!namespace) {
    return <NoMatch />;
  }

  return (
    <BackNavigationText
      text={namespaceName}
      onBackClick={() => navigate('/settings/namespaces')}
    />
  );
};

export default NamespaceDetails;
