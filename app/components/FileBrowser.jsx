import React, { useContext, useMemo, useCallback, useEffect } from 'react';
import { UIManagerContext } from 'ui-context/index';
import {
  SidebarRow,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  DocumentAddIcon,
  NullIcon,
  ButtonIcon,
} from 'ui-components/index';
import {
  useDeleteFile,
  useListCachedNoteWsPaths,
  useWorkspacePath,
  resolvePath,
} from 'workspace/index';
import { useLocalStorage } from 'utils/hooks';
import { useInputPaletteNewNoteCommand } from 'app/Palette/Commands';
import { fileWsPathsToFlatDirTree } from './file-ws-paths-to-flat-dir-tree';

const DEFAULT_FOLD_DEPTH = 2;
FileBrowser.propTypes = {};

// TODO the current design just ignores empty directory
export function FileBrowser() {
  let [files = [], refreshFiles] = useListCachedNoteWsPaths();
  const deleteByWsPath = useDeleteFile();
  const { dispatch, widescreen } = useContext(UIManagerContext);
  const { wsName, wsPath: activeWSPath, pushWsPath } = useWorkspacePath();
  const activeFilePath = activeWSPath && resolvePath(activeWSPath).filePath;
  const newFileCommand = useInputPaletteNewNoteCommand();
  const closeSidebar = useCallback(() => {
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
      value: { type: null },
    });
  }, [dispatch]);

  const deleteFile = useCallback(
    async (wsPath) => {
      await deleteByWsPath(wsPath);
      await refreshFiles();
    },
    [refreshFiles, deleteByWsPath],
  );

  useEffect(() => {
    refreshFiles();
  }, [wsName, refreshFiles]);

  const createNewFile = useCallback(
    (path) => {
      newFileCommand({ initialQuery: path });
    },
    [newFileCommand],
  );

  const { filesAndDirList, dirSet } = useMemo(() => {
    return fileWsPathsToFlatDirTree(files);
  }, [files]);

  if (!wsName || filesAndDirList.length === 0) {
    return null;
  }

  return (
    <RenderItems
      wsName={wsName}
      filesAndDirList={filesAndDirList}
      dirSet={dirSet}
      deleteFile={deleteFile}
      pushWsPath={pushWsPath}
      widescreen={widescreen}
      activeFilePath={activeFilePath}
      closeSidebar={closeSidebar}
      createNewFile={createNewFile}
    />
  );
}
const IconStyle = {
  height: 16,
  width: 16,
};

const RenderItems = React.memo(
  ({
    wsName,
    filesAndDirList,
    dirSet,
    deleteFile,
    pushWsPath,
    widescreen,
    activeFilePath,
    closeSidebar,
    createNewFile,
  }) => {
    const [collapsed, toggleCollapse] = useLocalStorage(
      'RenderTree6259:' + wsName,
      () => {
        const result = filesAndDirList.filter(
          (path) =>
            dirSet.has(path) && path.split('/').length === DEFAULT_FOLD_DEPTH,
        );
        console.log('being computed');
        return result;
      },
    );

    return filesAndDirList
      .filter((path) => {
        if (
          collapsed.some((collapseDirPath) =>
            path.startsWith(collapseDirPath + '/'),
          )
        ) {
          return false;
        }
        return true;
      })
      .map((path, i) => {
        const splittedPath = path.split('/');
        const depth = splittedPath.length;
        const name = splittedPath.pop();
        // this works because by design we cannot have empty directories
        const isDir = dirSet.has(path);
        const wsPath = wsName + ':' + path;
        const onClick = (event) => {
          if (isDir) {
            toggleCollapse((array) => {
              if (array.includes(path)) {
                return array.filter((p) => p !== path);
              } else {
                return [...array, path];
              }
            });
            return;
          }
          if (event.metaKey) {
            pushWsPath(wsPath, true);
          } else if (event.shiftKey) {
            pushWsPath(wsPath, false, true);
          } else {
            pushWsPath(wsPath);
          }
          if (!widescreen) {
            closeSidebar();
          }
        };

        return (
          <SidebarRow
            key={path}
            depth={depth}
            basePadding={16}
            title={name}
            onClick={onClick}
            isActive={activeFilePath === path}
            leftIcon={
              isDir ? (
                collapsed.includes(path) ? (
                  <ChevronRightIcon style={IconStyle} />
                ) : (
                  <ChevronDownIcon style={IconStyle} />
                )
              ) : (
                <NullIcon style={IconStyle} />
              )
            }
            rightHoverIcon={
              isDir ? (
                <ButtonIcon
                  hint="New file"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (depth === 0) {
                      createNewFile();
                    } else {
                      createNewFile(path + '/');
                    }
                  }}
                  hintPos="bottom-right"
                >
                  <DocumentAddIcon style={IconStyle} />
                </ButtonIcon>
              ) : (
                <ButtonIcon
                  hint="Delete file"
                  hintPos="bottom-right"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        `Are you sure you want to delete "${name}"? `,
                      )
                    ) {
                      deleteFile(wsPath);
                    }
                  }}
                >
                  <CloseIcon style={IconStyle} />
                </ButtonIcon>
              )
            }
          />
        );
      });
  },
);
