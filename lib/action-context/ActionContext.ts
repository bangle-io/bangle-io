import { useContext } from 'react';

import { ActionContext } from './ActionContextProvider';

export function useActionContext() {
  return useContext(ActionContext);
}
