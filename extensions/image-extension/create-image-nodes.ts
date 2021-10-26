import { FileOps } from '@bangle.io/workspaces';

import { wsNameViewWeakStore } from './config';
import { calcImageDimensions } from './image-file-helpers';
import { createImage } from './image-writing';

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
