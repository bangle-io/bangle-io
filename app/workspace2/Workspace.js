import React, { useEffect, useState, useReducer, useCallback } from 'react';
import { useWorkspaceDetails } from './workspace-hooks';

export function Workspace({}) {
  const { wsName } = useWorkspaceDetails();
  const [wsDetails, updateWSDetails] = useState();
  useEffect(() => {}, [wsName]);
}
