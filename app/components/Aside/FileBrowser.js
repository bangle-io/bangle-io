import './aside.css';
import React, { useCallback, useContext, useMemo } from 'react';
import { SideBar } from './SideBar';
import { CollapsibleSideBarRow, SideBarRow } from './SideBarRow';
import { BaseButton } from '../Button';
import 'css.gg/icons/css/chevron-down.css';
import { ChevronDown, ChevronRight } from '../Icons/index';
import {
  useCreateFile,
  useDeleteFile,
  useGetWorkspaceFiles,
  useWorkspaceDetails,
} from 'bangle-io/app/workspace/workspace-hooks';
import { resolvePath } from 'bangle-io/app/workspace/path-helpers';
import { UIManagerContext } from 'bangle-io/app/ui/UIManager';

FileBrowser.propTypes = {};

export function FileBrowser() {
  const [files] = useGetWorkspaceFiles();
  const createNewFile = useCreateFile();
  const deleteByDocName = useDeleteFile();
  const { dispatch } = useContext(UIManagerContext);
  const { wsName, wsPath: activeWSPath, pushWsPath } = useWorkspaceDetails();

  const toggleTheme = () =>
    dispatch({
      type: 'UI/TOGGLE_THEME',
    });

  const openNew = useCallback(() => {
    createNewFile();
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
    });
  }, [dispatch, createNewFile]);

  const fileTree = useMemo(
    () =>
      flatPathsToTree(
        files.map((f) => {
          const { filePath } = resolvePath(f);

          return filePath;
        }),
      ),
    [files],
  );

  return (
    <SideBar
      openNew={openNew}
      toggleTheme={toggleTheme}
      downloadBackup={() => {}}
    >
      <CollapsibleSideBarRow
        title={wsName}
        isSticky={true}
        leftIcon={<ChevronDown style={{ width: 16, height: 16 }} />}
        activeLeftIcon={<ChevronRight style={{ width: 16, height: 16 }} />}
      >
        <RenderPathTree
          key={wsName}
          fileTree={fileTree}
          wsName={wsName}
          deleteByDocName={deleteByDocName}
          pushWsPath={pushWsPath}
          activeWSPath={activeWSPath}
          dispatch={dispatch}
        />
      </CollapsibleSideBarRow>
    </SideBar>
  );
}

function RenderPathTree({
  fileTree,
  wsName,
  deleteByDocName,
  pushWsPath,
  activeWSPath,
  dispatch,
  paddingLeft,
}) {
  if (Array.isArray(fileTree)) {
    return fileTree.map((child) => (
      <RenderPathTree
        fileTree={child}
        key={child.name}
        wsName={wsName}
        deleteByDocName={deleteByDocName}
        pushWsPath={pushWsPath}
        activeWSPath={activeWSPath}
        dispatch={dispatch}
        paddingLeft={paddingLeft}
      />
    ));
  }

  const { name, children, path } = fileTree;
  if (children) {
    return (
      <CollapsibleSideBarRow
        title={name}
        paddingLeft={paddingLeft}
        isSticky={true}
        leftIcon={<ChevronDown style={{ width: 16, height: 16 }} />}
        activeLeftIcon={<ChevronRight style={{ width: 16, height: 16 }} />}
      >
        {children.map((child) => (
          <RenderPathTree
            key={child.name}
            fileTree={child}
            wsName={wsName}
            deleteByDocName={deleteByDocName}
            pushWsPath={pushWsPath}
            activeWSPath={activeWSPath}
            dispatch={dispatch}
          />
        ))}
      </CollapsibleSideBarRow>
    );
  }
  // for the files
  if (path) {
    // treat as an empty folder
    if (!name.includes('.')) {
      return (
        <CollapsibleSideBarRow
          title={name}
          leftIcon={<ChevronDown style={{ width: 16, height: 16 }} />}
          activeLeftIcon={<ChevronRight style={{ width: 16, height: 16 }} />}
        ></CollapsibleSideBarRow>
      );
    } else {
      const wsPath = wsName + ':' + path;
      return (
        <SideBarRow
          key={wsPath}
          onClick={() => {
            pushWsPath(wsPath);
          }}
          title={name}
          isActive={activeWSPath === wsPath}
          paddingLeft={paddingLeft}
          rightIcon={[
            <BaseButton
              key="delete"
              className="text-gray-600 hover:text-gray-900"
              faType="fas fa-times-circle "
              onClick={async (e) => {
                e.stopPropagation();
                deleteByDocName(wsPath);
                dispatch({
                  type: 'UI/TOGGLE_SIDEBAR',
                });
              }}
            />,
          ]}
        />
      );
    }
  }
}

/**
 *
 * @returns An array of deeply nested objects
 *          {name: string, ?children: Array<self>, ?path: string}
 *          for terminals children will be undefined and the
 *          object will have path which will be the absolute path of the file
 */
export function flatPathsToTree(files) {
  let mainChain = [];

  for (const f of files) {
    const path = f.split('/');
    let chain = mainChain;
    let counter = 0;
    for (const part of path) {
      counter++;

      let match = chain.find(({ name }) => name === part);

      if (!match) {
        match = { name: part, children: [] };
        if (counter === path.length) {
          match.path = f;
          delete match.children;
        }
        chain.push(match);
      }

      chain = match.children;
    }
  }

  return mainChain;
}
