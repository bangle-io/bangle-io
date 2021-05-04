import { useEditorViewContext } from '@bangle.dev/react';
import { useEffect } from 'react';
import { getDayJs } from 'utils/index';
import { IMAGE_SAVE_DIR } from './config';
import {
  filePathToWsPath,
  resolvePath,
  saveFile,
  useWorkspacePath,
} from 'workspace/index';

// TODO I need a better solution to access
// app contexts from inside of a pm plugin
// as always a PM plugin.
const wsPathViewWeakStore = new WeakMap();

export function EditorImageComponent() {
  const view = useEditorViewContext();
  const { wsPath } = useWorkspacePath();
  useEffect(() => {
    if (wsPath) {
      wsPathViewWeakStore.set(view, wsPath);
    }
    return () => {
      // I know weakmap will automatically clean it
      // but still :shrug
      wsPathViewWeakStore.delete(view);
    };
  }, [view, wsPath]);
  return null;
}

export async function createImageNodes(files, imageType, view) {
  const sources = await Promise.all(
    files.map((file) => getSourceFromFile(file, view)),
  );
  return sources.filter(Boolean).map((source) => {
    return imageType.create({
      src: source,
    });
  });
}

async function getSourceFromFile(file, view) {
  const currentFileWsPath = wsPathViewWeakStore.get(view);
  if (!currentFileWsPath) {
    return Promise.resolve();
  }

  const { wsName } = resolvePath(currentFileWsPath);

  const fileName = file.name;
  // TODO check filename in other browsers
  const name = fileName.slice(0, fileName.lastIndexOf('.'));
  const ext = fileName.slice(fileName.lastIndexOf('.'));

  const dayJs = await getDayJs();
  const date = dayJs(Date.now()).format('YYYY-MM-DD-HH-mm-ss-SSS');
  const newFilename = `${name}-${date}${ext}`;
  const imageWsPath = filePathToWsPath(
    wsName,
    IMAGE_SAVE_DIR + '/' + newFilename,
  );

  await saveFile(
    filePathToWsPath(wsName, IMAGE_SAVE_DIR + '/' + newFilename),
    file,
  );

  // prepending a / to make it an absolute URL
  // since we are returning a web url we need to encode it
  return encodeURI('/' + resolvePath(imageWsPath).filePath);
}
