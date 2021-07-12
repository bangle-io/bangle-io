import { ActionContext } from './ActionContextProvider';
import { useContext } from 'react';

export function useActionContext() {
  return useContext(ActionContext);
}
