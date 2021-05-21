import { useEditorViewContext } from '@bangle.dev/react';
import { useEffect } from 'react';
import { IMAGE_SAVE_DIR } from './config';
import {
  filePathToWsPath,
  resolvePath,
  saveFile,
  useWorkspacePath,
} from 'workspace/index';
import {
  calcImageDimensions,
  setImageMetadataInWsPath,
} from './image-file-helpers';

// TODO I need a better solution to access
// app contexts from inside of a pm plugin
const wsNameViewWeakStore = new WeakMap();

export function EditorImageComponent() {
  const view = useEditorViewContext();
  const { wsName } = useWorkspacePath();
  useEffect(() => {
    if (wsName) {
      wsNameViewWeakStore.set(view, wsName);
    }
    return () => {
      // I know weakmap will automatically clean it
      // but still :shrug
      wsNameViewWeakStore.delete(view);
    };
  }, [view, wsName]);
  return null;
}

export async function createImageNodes(files, imageType, view) {
  const sources = await Promise.all(
    files.map(async (file) => {
      const wsName = wsNameViewWeakStore.get(view);

      if (!wsName) {
        return Promise.resolve();
      }

      const objectUrl = window.URL.createObjectURL(file);
      const dimensions = await calcImageDimensions(objectUrl);
      window.URL.revokeObjectURL(objectUrl);

      const { wsPath, srcUrl } = await createImage(
        file.name,
        wsName,
        dimensions,
      );

      await saveFile(wsPath, file);

      return srcUrl;
    }),
  );
  return sources.filter(Boolean).map((source) => {
    return imageType.create({
      src: source,
    });
  });
}

/**
 *
 * @param {*} fileName  - the filename name of the image
 * @param {*} wsName - the current wsName
 * @param {*} dimensions - the the widthxheight of the image
 * @param {Boolean} timestamp - whether to add timestamp in the fileName for uniqueness. If fileName already has one it will be updated
 * @returns - a wsPath and srcUrl for the image
 */
export async function createImage(fileName, wsName, dimensions, timestamp) {
  let imageWsPath = filePathToWsPath(wsName, IMAGE_SAVE_DIR + '/' + fileName);

  imageWsPath = await setImageMetadataInWsPath(imageWsPath, dimensions, true);
  // pre-pending a / to make it an absolute URL
  // since we are returning a web url we need to encode it
  return {
    wsPath: imageWsPath,
    srcUrl: encodeURI('/' + resolvePath(imageWsPath).filePath),
  };
}
