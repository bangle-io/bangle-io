import React, { useCallback, useEffect } from 'react';
import { keybindingsHelper } from '../misc/keybinding-helper';
import {
  useWorkspaceDetails,
  useWorkspacePermission,
} from '../workspace2/workspace-hooks';

const NeedsPermission = ({ wsName, requestPermission }) => {
  return (
    <div
      className="flex justify-center flex-row h-full"
      onClick={requestPermission}
    >
      Press Enter twice or click anywhere to resume working on {wsName}
    </div>
  );
};

export function WorkspacePermissionModal({ children }) {
  // const { wsName } = useWorkspaceDetails();
  // const [permission, requestPermission] = useWorkspacePermission();
  // const active = permission === 'rejected' || permission === undefined;

  // const open = useCallback(() => {
  //   requestPermission();
  // }, [requestPermission]);

  // useEffect(() => {
  //   let callback;
  //   if (active) {
  //     callback = keybindingsHelper({
  //       Enter: () => {
  //         if (!active) {
  //           return false;
  //         }
  //         open();
  //         return true;
  //       },
  //     });
  //     document.addEventListener('keydown', callback);
  //   }
  //   return () => {
  //     if (callback) {
  //       document.removeEventListener('keydown', callback);
  //       callback = undefined;
  //     }
  //   };
  // }, [active, open]);

  // if (active) {
  //   return (
  //     <NeedsPermission
  //       wsName={wsName}
  //       requestPermission={open}
  //       rejected={permission === 'rejected'}
  //     />
  //   );
  // }

  return children;
}
