import { useHistory, matchPath, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { Node } from '@bangle.dev/core/prosemirror/model';
import {
  isValidNoteWsPath,
  locationToFilePath,
  resolvePath,
  toFSPath,
} from './path-helpers';
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspaceInfo,
  listWorkspaces,
} from './workspace-helpers';
import { checkWidescreen, useDestroyRef } from 'utils/index';
import { importGithubWorkspace } from './github-helpers';
import {
  HELP_FS_INDEX_FILE_NAME,
  HELP_FS_WORKSPACE_NAME,
  HELP_FS_WORKSPACE_TYPE,
} from 'config/help-fs';
import { getFileSystemFromWsInfo } from './get-fs';
const LOG = false;
let log = LOG ? console.log.bind(console, 'workspace/index') : () => {};

export function useWorkspaces() {
  const [workspaces, updateWorkspaces] = useState([]);
  const { wsName } = useWorkspacePath();
  const history = useHistory();
  const destroyedRef = useDestroyRef();

  const refreshWorkspaces = useCallback(() => {
    listWorkspaces().then((workspaces) => {
      if (!destroyedRef.current) {
        updateWorkspaces(workspaces);
      }
    });
  }, [destroyedRef]);

  const createWorkspaceCb = useCallback(
    async (wsName, type, opts) => {
      await createWorkspace(wsName, type, opts);
      history.push(`/ws/${wsName}`);
    },
    [history],
  );

  const importWorkspaceFromGithubCb = useCallback(
    // can pass alternate wsName in the options
    async (bangleIOContext, url, wsType, opts = {}) => {
      const wsName = await importGithubWorkspace(
        bangleIOContext,
        url,
        wsType,
        opts.wsName,
        opts.token,
      );

      await refreshWorkspaces();
      history.push(`/ws/${wsName}`);
    },
    [history, refreshWorkspaces],
  );

  const deleteWorkspaceCb = useCallback(
    async (targetWsName) => {
      await deleteWorkspace(targetWsName);
      if (targetWsName === wsName) {
        history.push(`/ws/`);
      } else {
        refreshWorkspaces();
      }
    },
    [history, wsName, refreshWorkspaces],
  );

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const switchWorkspaceCb = useCallback(
    async (wsName, newTab) => {
      const newPath = '/ws/' + wsName;
      if (newTab) {
        window.open(newPath);
        return;
      }
      history.push(newPath);
    },
    [history],
  );

  return {
    workspaces,
    createWorkspace: createWorkspaceCb,
    deleteWorkspace: deleteWorkspaceCb,
    switchWorkspace: switchWorkspaceCb,
    importWorkspaceFromGithub: importWorkspaceFromGithubCb,
  };
}

/**
 * WARNING check if wsName, wsPath exists before working on it
 */
export function useWorkspacePath() {
  // I think history doesn't change when location changes
  // so it is a good idea to use useLocation instead of location
  const location = useLocation();
  const history = useHistory();
  const match = matchPath(location.pathname, {
    path: '/ws/:wsName',
    exact: false,
    strict: false,
  });

  const { wsName = HELP_FS_WORKSPACE_NAME } = match?.params ?? {};

  let wsPath;
  let filePath = locationToFilePath(location);
  if (filePath) {
    wsPath = wsName + ':' + filePath;
  }
  // show the landing page if no file path i.e. at root '/'
  else if (wsName === HELP_FS_WORKSPACE_NAME && !filePath) {
    wsPath = wsName + ':' + HELP_FS_INDEX_FILE_NAME;
    filePath = resolvePath(wsPath).filePath;
  }

  const search = new URLSearchParams(location?.search);
  const secondaryWsPath = search.get('secondary') ?? undefined;

  const replaceSecondaryWsPath = useCallback(
    (wsPath) => {
      const isWidescreen = checkWidescreen();
      const newSearch = new URLSearchParams(location?.search);
      if (isWidescreen) {
        // replace is intentional as native history pop
        // for some reason isnt remembering the state.
        if (isWidescreen) {
          newSearch.set('secondary', wsPath);
        } else {
          newSearch.delete('secondary');
        }
        history.replace({
          ...location,
          search: newSearch.toString(),
        });
        return;
      }
    },
    [history, location],
  );

  const pushWsPath = useCallback(
    (wsPath, newTab = false, secondary = false) => {
      const { wsName, filePath } = resolvePath(wsPath);
      const newPath = encodeURI(`/ws/${wsName}/${filePath}`);
      if (newTab) {
        window.open(newPath);
        return;
      }

      const isWidescreen = checkWidescreen();
      const newSearch = new URLSearchParams(location?.search);

      if (isWidescreen && secondary) {
        replaceSecondaryWsPath(wsPath);
        return;
      }

      if (newPath === location.pathname && !secondary) {
        return;
      }
      history.push({
        ...location,
        pathname: newPath,
        search: newSearch.toString(),
      });
    },
    [history, location, replaceSecondaryWsPath],
  );

  const replaceWsPath = useCallback(
    (wsPath) => {
      const { wsName, filePath } = resolvePath(wsPath);
      log('replaceWsPath', wsPath);

      history.replace({
        ...location,
        pathname: encodeURI(`/ws/${wsName}/${filePath}`),
      });
    },
    [history, location],
  );

  // removes the currently active wsPath
  const removeWsPath = useCallback(() => {
    if (!wsPath) {
      return;
    }

    let newPath = null;

    // transition any secondary to main
    if (secondaryWsPath) {
      const { wsName, filePath } = resolvePath(secondaryWsPath);
      newPath = encodeURI(`/ws/${wsName}/${filePath}`);
    } else {
      newPath = encodeURI(`/ws/${wsName}`);
    }

    history.push(newPath);
  }, [history, wsPath, wsName, secondaryWsPath]);

  // the editor on side
  const removeSecondaryWsPath = useCallback(() => {
    log('removeSecondaryWsPath');
    const newSearch = new URLSearchParams(location?.search);
    newSearch.delete('secondary');
    history.replace({
      ...location,
      search: newSearch.toString(),
    });
  }, [history, location]);

  const removePrimaryAndSecondaryWsPath = useCallback(() => {
    log('removePrimaryAndSecondaryWsPath');
    const newSearch = new URLSearchParams(location?.search);
    newSearch.delete('secondary');
    history.replace({
      ...location,
      pathname: encodeURI(`/ws/${wsName}`),
      search: newSearch.toString(),
    });
  }, [wsName, history, location]);

  const replacePrimaryAndSecondaryWsPath = useCallback(
    (primaryWsPath, secondaryWsPath) => {
      const { wsName, filePath } = resolvePath(primaryWsPath);
      const newPath = encodeURI(`/ws/${wsName}/${filePath}`);
      const isWidescreen = checkWidescreen();

      const newSearch = new URLSearchParams(location?.search);
      if (secondaryWsPath) {
        if (isWidescreen) {
          newSearch.set('secondary', secondaryWsPath);
        } else {
          newSearch.delete('secondary');
        }
      }

      history.push({
        ...location,
        pathname: newPath,
        search: newSearch.toString(),
      });
    },
    [history, location],
  );

  return {
    wsName,
    wsPath,
    secondaryWsPath,
    filePath,
    pushWsPath,
    replaceWsPath,
    replaceSecondaryWsPath,
    removeWsPath,
    removeSecondaryWsPath,
    removePrimaryAndSecondaryWsPath,
    replacePrimaryAndSecondaryWsPath,
  };
}

const isHelpFileModified = async (wsPath) => {
  if (!wsPath) {
    return false;
  }
  const { wsName } = resolvePath(wsPath);

  if (wsName !== HELP_FS_WORKSPACE_NAME) {
    return false;
  }

  const wsInfo = await getWorkspaceInfo(wsName);

  if (wsInfo.type !== HELP_FS_WORKSPACE_TYPE) {
    return false;
  }

  const fs = getFileSystemFromWsInfo(wsInfo);

  const isModified = await fs.isFileModified(toFSPath(wsPath));

  return isModified;
};

/**
 * A hook that checks if the user has made any modifications
 * to the help workspace. Will return isModified false is not currently
 * in help workspace.
 * @param {*} checkInterval time to check
 * @returns
 */
export function useIsHelpWorkspaceModified(wsPath, checkInterval = 6000) {
  const [isModified, updateModified] = useState(false);

  const wsName = wsPath && resolvePath(wsPath).wsName;

  const isHelpWorkspace = wsName === HELP_FS_WORKSPACE_NAME;

  useEffect(() => {
    let id;
    let effectDestroyed = false;
    if (isHelpWorkspace && wsPath && isValidNoteWsPath(wsPath)) {
      id = setInterval(() => {
        isHelpFileModified(wsPath).then((result) => {
          if (effectDestroyed) {
            return;
          }
          if (result) {
            updateModified(result);
          }
        });
      }, checkInterval);
    }
    return () => {
      effectDestroyed = true;
      if (id != null) {
        clearInterval(id);
      }
    };
  }, [wsPath, wsName, isModified, checkInterval, isHelpWorkspace]);

  useEffect(() => {
    return () => {
      updateModified(false);
    };
  }, [wsName]);

  return { isModified, isHelpWorkspace };
}
