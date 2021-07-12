import { useContext, createContext } from 'react';

export const ActionContext = createContext({});

export function useActionContext() {
  return useContext(ActionContext);
}
