import React, { useState, useEffect } from 'react';
import {
  getFile,
  isValidFileWsPath,
  useWorkspacePath,
  parseLocalFilePath,
} from 'workspace/index';
import { useDestroyRef } from 'utils/index';

import {
  calcImageDimensions,
  imageDimensionFromWsPath,
} from './image-file-helpers';

export const renderImageReactNodeView = {
  image: (nodeViewRenderArg) => {
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

function ImageComponent({ nodeAttrs }) {
  const { src: inputSrc, alt } = nodeAttrs;
  const [imageSrc, updateImageSrc] = useState(null);
  const { wsPath } = useWorkspacePath();
  const imageWsPath = wsPath && parseLocalFilePath(inputSrc, wsPath);

  const [{ height, width }, updateDimensions] = useState(() => {
    if (imageWsPath) {
      return imageDimensionFromWsPath(imageWsPath) ?? {};
    }
    return {};
  });
  const destroyRef = useDestroyRef();

  useEffect(() => {
    let objectUrl;

    if (wsPath) {
      if (isOtherSources(inputSrc)) {
        updateImageSrc(inputSrc);
      } else {
        if (isValidFileWsPath(inputSrc)) {
          throw new Error('Image source cannot be a wsPath');
        }

        getFile(imageWsPath)
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
    return () => {
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [inputSrc, wsPath, destroyRef, imageWsPath, width]);

  let newWidth = width;
  let newHeight = height;
  if (width && alt && /.*scale\d.\d\d$/.test(alt)) {
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
