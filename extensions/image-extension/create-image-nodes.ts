import type { EditorView, NodeType } from '@bangle.dev/pm';

import { nsmApi2 } from '@bangle.io/api';
import { getEditorPluginMetadata } from '@bangle.io/editor-common';
import { resolvePath2 } from '@bangle.io/ws-path';

import { calcImageDimensions } from './image-file-helpers';
import { createImage } from './image-writing';

export async function createImageNodes(
  files: File[],
  imageType: NodeType,
  view: EditorView,
) {
  const { wsPath: currentWsPath } = getEditorPluginMetadata(view.state);
  const { wsName } = resolvePath2(currentWsPath);

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

      // exit if the workspace has changed
      if (wsName !== nsmApi2.workspace.workspaceState().wsName) {
        return undefined;
      }

      await nsmApi2.workspace.writeFile(wsPath, file);

      return srcUrl;
    }),
  );

  return sources.filter(Boolean).map((source) => {
    return imageType.create({
      src: source,
    });
  });
}
