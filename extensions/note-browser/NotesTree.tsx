import React, { useContext, useMemo, useCallback } from 'react';
import { UIManagerContext } from 'ui-context/index';
import {
  Sidebar,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  DocumentAddIcon,
  NullIcon,
  ButtonIcon,
} from 'ui-components/index';
import { filePathToWsPath, resolvePath } from 'ws-path';
import { useWorkspaceContext } from 'workspace-context';
import { useLocalStorage } from 'utils/index';
import { fileWsPathsToFlatDirTree } from './file-ws-paths-to-flat-dir-tree';
import { useVirtual } from 'react-virtual';
import { ActionContext } from 'action-context';

const DEFAULT_FOLD_DEPTH = 2;

const rem =
  typeof window === 'undefined'
    ? 16
    : parseFloat(getComputedStyle(document.documentElement).fontSize);

const rowHeight = 1.5 * rem; // 1.75rem line height of text-lg

// TODO the current design just ignores empty directory
// TODO check if in widescreen sidebar is closed
export function NotesTree() {
  const { pushWsPath, noteWsPaths = [], deleteNote } = useWorkspaceContext();

  const { dispatch, widescreen } = useContext(UIManagerContext);
  const { wsName, primaryWsPath } = useWorkspaceContext();
  const { dispatchAction } = useContext(ActionContext);

  const activeFilePath = primaryWsPath && resolvePath(primaryWsPath).filePath;

  const closeSidebar = useCallback(() => {
    if (!widescreen) {
      dispatch({
        type: 'UI/TOGGLE_SIDEBAR',
        value: { type: null },
      });
    }
  }, [dispatch, widescreen]);

  const createNewFile = useCallback(
    (path) => {
      dispatchAction({
        name: '@action/core-actions/NEW_NOTE_ACTION',
        value: path,
      });
    },
    [dispatchAction],
  );

  return (
    <GenericFileBrowser
      wsName={wsName}
      files={noteWsPaths}
      deleteNote={deleteNote}
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

export const GenericFileBrowser = React.memo(function GenericFileBrowser({
  wsName,
  files,
  deleteNote,
  pushWsPath,
  widescreen,
  activeFilePath,
  closeSidebar,
  createNewFile,
}) {
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
      deleteNote={deleteNote}
      pushWsPath={pushWsPath}
      widescreen={widescreen}
      activeFilePath={activeFilePath}
      closeSidebar={closeSidebar}
      createNewFile={createNewFile}
    />
  );
});

function RenderRow({
  virtualRow,
  path,
  isDir,
  wsPath,
  name,
  depth,
  isActive,
  isCollapsed,
  createNewFile,
  deleteNote,
  onClick,
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      <Sidebar.Row
        depth={depth}
        basePadding={16}
        title={name}
        onClick={onClick}
        isActive={isActive}
        // before changing this look at estimateSize of virtual
        textSizeClassName="text-base"
        leftNode={
          isDir ? (
            isCollapsed ? (
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
                  window.confirm(`Are you sure you want to delete "${name}"? `)
                ) {
                  deleteNote(wsPath);
                }
              }}
            >
              <CloseIcon style={IconStyle} />
            </ButtonIcon>
          )
        }
      />
    </div>
  );
}

const RenderItems = React.memo(
  ({
    wsName,
    filesAndDirList,
    dirSet,
    deleteNote,
    pushWsPath,
    activeFilePath,
    closeSidebar,
    createNewFile,
  }) => {
    const [collapsed, toggleCollapse] = useLocalStorage(
      'RenderTree6261:' + wsName,
      () => {
        const result = filesAndDirList.filter(
          (path) =>
            dirSet.has(path) && path.split('/').length === DEFAULT_FOLD_DEPTH,
        );
        return result;
      },
    );
    const parentRef = React.useRef();
    const rows = useMemo(() => {
      return filesAndDirList.filter((path) => {
        if (
          collapsed.some((collapseDirPath) =>
            path.startsWith(collapseDirPath + '/'),
          )
        ) {
          return false;
        }
        return true;
      });
    }, [filesAndDirList, collapsed]);

    const rowVirtualizer = useVirtual({
      size: rows.length,
      parentRef,
      overscan: 60,
      estimateSize: React.useCallback(() => {
        // NOTE its easy to trip this and make it run on every render
        // if (!window.counter) {
        //   window.counter = 1;
        // }
        // window.counter++;
        return rowHeight;
      }, []),
      keyExtractor: useCallback((i) => rows[i], [rows]),
    });

    const result = rowVirtualizer.virtualItems.map((virtualRow) => {
      const path = rows[virtualRow.index];
      const isDir = dirSet.has(path);
      const wsPath = filePathToWsPath(wsName, path);
      const splittedPath = path.split('/');
      const depth = splittedPath.length;
      const name = splittedPath.pop();

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
        closeSidebar();
      };

      return (
        <RenderRow
          key={path}
          virtualRow={virtualRow}
          path={path}
          isDir={isDir}
          wsPath={wsPath}
          name={name}
          depth={depth}
          isActive={activeFilePath === path}
          isCollapsed={collapsed.includes(path)}
          createNewFile={createNewFile}
          deleteNote={deleteNote}
          onClick={onClick}
        />
      );
    });

    return (
      <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
        <div
          style={{
            height: `${rowVirtualizer.totalSize}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {result}
        </div>
      </div>
    );
  },
);
