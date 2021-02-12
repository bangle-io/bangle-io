import { useEffect } from 'react';

/**
 * Catches unhandled sync and async error
 */
export function useCatchError(callback) {
  useEffect(() => {
    const errorHandler = async (errorEvent) => {
      let error = errorEvent.error;
      if (errorEvent.promise) {
        try {
          await errorEvent.promise;
        } catch (promiseError) {
          error = promiseError;
        }
      }

      if (!error) {
        return;
      }

      callback(error);
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', errorHandler);
    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', errorHandler);
    };
  }, [callback]);
}
