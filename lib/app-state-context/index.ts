import React from 'react';

export interface AppState {
  hasPendingWrites?: boolean;
  pageLifecycleState?: string;
  prevPageLifecycleState?: string;
}
export const AppStateContext = React.createContext<{
  mutableAppStateValue?: AppState;
  appStateValue?: Readonly<AppState>;
  appState?: unknown;
}>({});
