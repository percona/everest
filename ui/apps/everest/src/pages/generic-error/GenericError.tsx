import { NoMatch } from 'pages/404/NoMatch';
import { Messages } from './genericError.messages';

export const GenericError = () => {
  return <NoMatch header={Messages.header} subHeader={Messages.subHeader} />;
};
