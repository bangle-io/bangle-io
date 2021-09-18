import React, { useEffect, useState } from 'react';
import { useDestroyRef } from 'utils';
import { useWorkspaceContext } from 'workspace-context';
import { FileOps } from 'workspaces';
import { isValidFileWsPath, parseLocalFilePath } from 'ws-path';
import {
  calcImageDimensions,
  imageDimensionFromWsPath,
} from './image-file-helpers';

export const renderImageReactNodeView = {
  image: ({ nodeViewRenderArg }) => {
    return <ImageComponent nodeAttrs={nodeViewRenderArg.node.attrs} />;
  },
};

const isOtherSources = (src) => {
  return (
    !src ||
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:image/')
  );
};

export function ImageComponent({ nodeAttrs }) {
  const { src: inputSrc, alt } = nodeAttrs;
  const [imageSrc, updateImageSrc] = useState(null);
  const { primaryWsPath } = useWorkspaceContext();
  const imageWsPath =
    primaryWsPath && !isOtherSources(inputSrc)
      ? parseLocalFilePath(inputSrc, primaryWsPath)
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
    let objectUrl;

    if (primaryWsPath) {
      if (isOtherSources(inputSrc)) {
        updateImageSrc(inputSrc);
      } else {
        if (isValidFileWsPath(inputSrc)) {
          throw new Error('Image source cannot be a wsPath');
        }

        if (imageWsPath) {
          FileOps.getFile(imageWsPath)
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
  }, [inputSrc, primaryWsPath, destroyRef, imageWsPath, width]);

  let newWidth = width;
  let newHeight = height;
  if (width && height && alt && /.*scale\d.\d\d$/.test(alt)) {
    const perc = parseFloat(alt.split('scale')[1]);

    newWidth = perc * width;
    newHeight = perc * height;
  }

  return (
    <img
      src={imageSrc || '/404.png'}
      alt={alt || inputSrc}
      width={newWidth}
      height={newHeight}
      loading="lazy"
    />
  );
}
