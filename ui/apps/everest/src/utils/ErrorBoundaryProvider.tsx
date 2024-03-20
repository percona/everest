import React, { createContext, useState } from 'react';

type ErrorContextType = {
  hasError: boolean;
  updateError: (value: boolean) => void;
};

const ErrorContext = createContext<ErrorContextType>({
  hasError: false,
  updateError: () => {},
});

type ErrorContextProvider = {
  children: React.ReactNode;
};

const ErrorContextProvider = ({ children }: ErrorContextProvider) => {
  const [hasError, setHasError] = useState(false);

  const updateError = (value: boolean) => {
    setHasError(value);
  };

  return (
    <ErrorContext.Provider value={{ hasError, updateError }}>
      {children}
    </ErrorContext.Provider>
  );
};

export { ErrorContext, ErrorContextProvider };
