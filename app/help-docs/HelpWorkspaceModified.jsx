import { useCloneWorkspaceCmd } from 'commands';
import React, { useEffect, useContext } from 'react';
import { TextButton } from 'ui-components';
import { UIManagerContext } from 'ui-context';
import {
  deleteFile,
  listAllFiles,
  resolvePath,
  useIsHelpWorkspaceModified,
} from 'workspace/index';

export function HelpWorkspaceMonitor({ wsPath }) {
  const { dispatch } = useContext(UIManagerContext);
  const { isModified, isHelpWorkspace } = useIsHelpWorkspaceModified(wsPath);
  const wsName = wsPath && resolvePath(wsPath).wsName;
  const cloneWs = useCloneWorkspaceCmd();
  const uid = 'ws-modified-' + wsName;

  useEffect(() => {
    return () => {
      if (isHelpWorkspace) {
        dispatch({
          type: 'UI/DISMISS_NOTIFICATION',
          value: {
            uid,
          },
        });
      }
    };
  }, [wsName, uid, dispatch, isHelpWorkspace]);

  useEffect(() => {
    if (!isHelpWorkspace || !isModified) {
      return;
    }

    const reset = async (otherWsName) => {
      const files = await listAllFiles(otherWsName);
      await Promise.all(files.map((w) => deleteFile(w)));
    };
    dispatch({
      type: 'UI/SHOW_NOTIFICATION',
      value: {
        severity: 'warning',
        uid,
        content: (
          <span>
            Looks like you have modified a <b>Help file</b>!
            <br />
            Changes made here are temporary and we recommend that you create a
            new workspace if you care about these changes.
          </span>
        ),
        buttons: [
          <TextButton
            hintPos="left"
            className="ml-3"
            onClick={async () => {
              await reset(wsName);
              window.location.pathname = '';
            }}
            hint={`Delete current modifications\nand reset the help pages to their original content`}
          >
            Reset
          </TextButton>,
          <TextButton
            hintPos="left"
            className="ml-3"
            onClick={() => {
              cloneWs().then(() => {
                reset(wsName);
                dispatch({
                  type: 'UI/DISMISS_NOTIFICATION',
                  value: {
                    uid,
                  },
                });
              });
            }}
            hint={`Save the modifications to a new workspace\nand reset the help pages to their original content`}
          >
            Fork
          </TextButton>,
        ],
      },
    });
  }, [wsPath, isModified, uid, cloneWs, wsName, dispatch, isHelpWorkspace]);
  return null;
}
