import { GenericErrorIcon } from '@percona/ui-lib';
import { NoMatch } from 'pages/404/NoMatch';
import { useContext } from 'react';
import { ErrorContext } from 'utils/ErrorBoundaryProvider';
import { Messages } from './genericError.messages';

export const GenericError = () => {
  const { updateError } = useContext(ErrorContext);

  const resetErrorState = () => {
    updateError(false);
  };
  return (
    <NoMatch
      header={Messages.header}
      subHeader={Messages.subHeader}
      CustomIcon={GenericErrorIcon}
      onButtonClick={resetErrorState}
    />
  );
};
