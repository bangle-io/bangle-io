import React, { useEffect, useState } from 'react';

import { nsmApi2 } from '@bangle.io/api';
import type { RenderReactNodeView } from '@bangle.io/extension-registry';
import type { WsPath } from '@bangle.io/shared-types';
import { useDestroyRef } from '@bangle.io/utils';
import type { OpenedWsPaths } from '@bangle.io/ws-path';
import { isValidFileWsPath, parseLocalFilePath } from '@bangle.io/ws-path';

import {
  calcImageDimensions,
  imageDimensionFromWsPath,
} from './image-file-helpers';

interface ImageNodeAttrs {
  src: string;
  alt?: string;
}
export const renderImageReactNodeView: RenderReactNodeView = {
  image: ({ nodeViewRenderArg }) => {
    let { src, alt } = nodeViewRenderArg.node.attrs;

    return <ImageComponent nodeAttrs={{ src, alt }} />;
  },
};

const isOtherSources = (src?: string) => {
  return (
    !src ||
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:image/')
  );
};

export function ImageComponentInner({
  nodeAttrs,
  openedWsPaths,
  readFile,
}: {
  nodeAttrs: ImageNodeAttrs;
  openedWsPaths: OpenedWsPaths;
  readFile: (wsPath: WsPath) => Promise<File | undefined>;
}) {
  const { src: inputSrc, alt } = nodeAttrs;
  const [imageSrc, updateImageSrc] = useState<string | null>(null);
  const imageWsPath =
    openedWsPaths.primaryWsPath2 && !isOtherSources(inputSrc)
      ? parseLocalFilePath(inputSrc, openedWsPaths.primaryWsPath2)
      : undefined;

  const [dim, updateDimensions] = useState(() => {
    if (imageWsPath) {
      return imageDimensionFromWsPath(imageWsPath);
    }

    return undefined;
  });
  let height: number | undefined, width: number | undefined;

  if (dim) {
    ({ height, width } = dim);
  }
  const destroyRef = useDestroyRef();

  useEffect(() => {
    let objectUrl: string | null = null;

    if (openedWsPaths.primaryWsPath2) {
      if (isOtherSources(inputSrc)) {
        updateImageSrc(inputSrc);
      } else {
        if (isValidFileWsPath(inputSrc)) {
          throw new Error('Image source cannot be a wsPath');
        }

        if (imageWsPath) {
          readFile(imageWsPath)
            .then((file) => {
              if (!file) {
                return;
              }
              objectUrl = window.URL.createObjectURL(file);

              if (!width) {
                calcImageDimensions(objectUrl).then((dim) => {
                  if (!destroyRef.current) {
                    updateDimensions({ height: dim.height, width: dim.width });
                  }
                });
              }

              if (!destroyRef.current) {
                updateImageSrc(objectUrl);
              }
            })
            .catch((error) => {
              // silence the error in case we were not able
              // to get the image
            });
        }
      }
    }

    return () => {
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    inputSrc,
    openedWsPaths.primaryWsPath2,
    destroyRef,
    readFile,
    imageWsPath,
    width,
  ]);

  let newWidth = width;
  let newHeight = height;

  if (alt) {
    if (width && height && /.*scale\d.\d\d$/.test(alt)) {
      const scaled = alt.split('scale')[1];

      if (scaled) {
        const perc = parseFloat(scaled);

        newWidth = perc * width;
        newHeight = perc * height;
      }
    }
  }

  return (
    // DONOT make this img `lazy` as it causes memory leak where
    // editor is persisted forever.
    <img
      src={imageSrc || '/404.png'}
      alt={alt || inputSrc}
      width={newWidth}
      height={newHeight}
    />
  );
}

export function ImageComponent({ nodeAttrs }: { nodeAttrs: ImageNodeAttrs }) {
  const { openedWsPaths } = nsmApi2.workspace.useWorkspace();

  return (
    <ImageComponentInner
      nodeAttrs={nodeAttrs}
      openedWsPaths={openedWsPaths}
      readFile={nsmApi2.workspace.readFile}
    />
  );
}
