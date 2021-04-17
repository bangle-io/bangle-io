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
  useGetCachedWorkspaceFiles,
  useWorkspacePath,
  resolvePath,
} from 'workspace/index';
import { useLocalStorage } from 'utils/hooks';
import { useInputPaletteNewFileCommand } from 'app/Palette/Commands';

FileBrowser.propTypes = {};

export function FileBrowser() {
  const [files, refreshFiles] = useGetCachedWorkspaceFiles();
  const deleteByWsPath = useDeleteFile();
  const { dispatch, widescreen } = useContext(UIManagerContext);
  const { wsName, wsPath: activeWSPath, pushWsPath } = useWorkspacePath();
  const newFileCommand = useInputPaletteNewFileCommand();
  const closeSidebar = () => {
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
      value: { type: null },
    });
  };

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

  const createNewFile = (path) => {
    newFileCommand({ initialQuery: path });
  };

  const fileTree = useMemo(() => {
    const trees = flatPathsToTree(
      files.map((f) => {
        const { filePath } = resolvePath(f);
        return filePath;
      }),
    );
    // TODO adding this superfiically sort of messes with childrens id
    // as it will not contain them. I think we should move to converting
    // id to wsPath syntax. and make flatPathsToTree understand wsPath.
    // then in createNewFile make sure we are correctly sending the file path
    // and not wsPath.
    return { name: wsName, id: wsName, children: trees };
  }, [files, wsName]);

  if (!wsName) {
    return null;
  }

  return (
    <RenderTree
      depth={0}
      closeSidebar={closeSidebar}
      fileTree={fileTree}
      widescreen={widescreen}
      wsName={wsName}
      deleteFile={deleteFile}
      pushWsPath={pushWsPath}
      activeWSPath={activeWSPath}
      dispatch={dispatch}
      createNewFile={createNewFile}
    />
  );
}

const IconStyle = {
  height: 16,
  width: 16,
};

function RenderTree(props) {
  const {
    fileTree,
    wsName,
    pushWsPath,
    closeSidebar,
    widescreen,
    activeWSPath,
    deleteFile,
    depth,
    basePadding = 16,
    createNewFile,
  } = props;

  const { name, id, children: directChildren, path } = fileTree;
  const isFile = !Boolean(directChildren);
  const wsPath = isFile ? wsName + ':' + path : null;

  const [collapsed, toggleCollapse] = useLocalStorage(
    'RenderTree6254:' + wsName + '--' + id,
    depth === 0 ? false : true,
  );

  const onClick = (event) => {
    if (!isFile) {
      toggleCollapse(!collapsed);
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

  return isFile ? (
    <SidebarRow
      depth={depth}
      basePadding={basePadding}
      title={name}
      onClick={onClick}
      isActive={activeWSPath === wsPath}
      leftIcon={<NullIcon style={IconStyle} />}
      rightHoverIcon={
        <ButtonIcon
          hint="Delete file"
          hintPos="bottom-right"
          onClick={async (e) => {
            e.stopPropagation();
            if (
              window.confirm(
                `Are you sure you want to delete "${
                  resolvePath(wsPath).fileName
                }"? `,
              )
            ) {
              deleteFile(wsPath);
            }
          }}
        >
          <CloseIcon style={IconStyle} />
        </ButtonIcon>
      }
    ></SidebarRow>
  ) : (
    <SidebarRow
      depth={depth}
      basePadding={basePadding}
      title={name}
      onClick={onClick}
      leftIcon={
        collapsed ? (
          <ChevronRightIcon style={IconStyle} />
        ) : (
          <ChevronDownIcon style={IconStyle} />
        )
      }
      rightHoverIcon={
        <ButtonIcon
          hint="New file"
          onClick={async (e) => {
            e.stopPropagation();
            if (depth === 0) {
              createNewFile();
            } else {
              createNewFile(id + '/');
            }
          }}
          hintPos="bottom-right"
        >
          <DocumentAddIcon style={IconStyle} />
        </ButtonIcon>
      }
    >
      {collapsed
        ? null
        : directChildren.map((child) => (
            <RenderTree
              {...props}
              key={child.name}
              fileTree={child}
              depth={depth + 1}
              basePadding={16}
            />
          ))}
    </SidebarRow>
  );
}

/**
 *
 * @returns An array of deeply nested objects
 *          {name: string, ?children: Array<self>, ?path: string}
 *          for terminals `children` field will be undefined and the
 *          object will have `path` which will be the absolute path of the file
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
        match = {
          name: part,
          children: [],
          id: path.slice(0, counter).join('/'),
        };
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
