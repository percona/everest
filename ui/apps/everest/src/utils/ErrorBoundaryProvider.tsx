import React, { createContext, useState } from 'react';

type ErrorContextType = {
  hasError: boolean;
  errorObject: Error | null;
  updateError: (value: boolean) => void;
  updateErrorObject: (error: Error) => void;
};

const ErrorContext = createContext<ErrorContextType>({
  errorObject: null,
  hasError: false,
  updateError: () => {},
  updateErrorObject: () => {},
});

type ErrorContextProvider = {
  children: React.ReactNode;
};

const ErrorContextProvider = ({ children }: ErrorContextProvider) => {
  const [hasError, setHasError] = useState(false);
  const [errorObject, setErrorObject] = useState<Error | null>(null);

  const updateError = (value: boolean) => {
    setHasError(value);
  };

  const updateErrorObject = (error: Error) => {
    setErrorObject(error);
  };

  return (
    <ErrorContext.Provider
      value={{ hasError, updateError, updateErrorObject, errorObject }}
    >
      {children}
    </ErrorContext.Provider>
  );
};

export { ErrorContext, ErrorContextProvider };
