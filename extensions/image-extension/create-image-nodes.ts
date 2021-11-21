import type { EditorView } from '@bangle.dev/pm';

import { getEditorPluginMetadata } from '@bangle.io/utils';
import { FileOps } from '@bangle.io/workspaces';
import { resolvePath } from '@bangle.io/ws-path';

import { calcImageDimensions } from './image-file-helpers';
import { createImage } from './image-writing';

export async function createImageNodes(files, imageType, view: EditorView) {
  const { wsPath: currentWsPath } = getEditorPluginMetadata(view.state);
  const { wsName } = resolvePath(currentWsPath);

  const sources = await Promise.all(
    files.map(async (file) => {
      const objectUrl = window.URL.createObjectURL(file);
      const dimensions = await calcImageDimensions(objectUrl);
      window.URL.revokeObjectURL(objectUrl);
      const { wsPath, srcUrl } = await createImage(
        file.name,
        wsName,
        dimensions,
      );

      await FileOps.saveFile(wsPath, file);

      return srcUrl;
    }),
  );
  return sources.filter(Boolean).map((source) => {
    return imageType.create({
      src: source,
    });
  });
}
