import { useEffect, useRef } from 'react';

export const useFirstRender = (): boolean => {
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
  }, []);

  return firstRender.current;
};
