import { Logger } from '@bangle.io/base-utils';
import React, { createContext } from 'react';

export const LoggerContext = createContext(new Logger('default-logger'));

export function useLogger() {
  return React.useContext(LoggerContext);
}

export function LoggerProvider({
  children,
  logger,
}: {
  children: React.ReactNode;
  logger: Logger;
}) {
  return (
    <LoggerContext.Provider value={logger}>{children}</LoggerContext.Provider>
  );
}
