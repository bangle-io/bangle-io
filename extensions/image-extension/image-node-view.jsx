import React, { useState, useEffect } from 'react';
import {
  getFile,
  isValidFileWsPath,
  useWorkspacePath,
  parseLocalFilePath,
} from 'workspace/index';
import { useDestroyRef } from 'utils/index';

export const renderReactNodeView = {
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

export function ImageComponent({ nodeAttrs }) {
  const { src: inputSrc, alt } = nodeAttrs;
  const [imageSrc, updateImageSrc] = useState(null);
  const destroyRef = useDestroyRef();
  const { wsPath } = useWorkspacePath();

  useEffect(() => {
    let imageWsPath;
    let objectUrl;

    if (wsPath) {
      if (isOtherSources(inputSrc)) {
        updateImageSrc(inputSrc);
      } else {
        if (isValidFileWsPath(inputSrc)) {
          throw new Error('Image source cannot be a wsPath');
        } else {
          imageWsPath = parseLocalFilePath(inputSrc, wsPath);
        }

        getFile(imageWsPath)
          .then((file) => {
            if (!file) {
              return;
            }

            objectUrl = window.URL.createObjectURL(file);
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
  }, [inputSrc, wsPath, destroyRef]);

  // TODO add height width
  return (
    <img src={imageSrc || '/404.png'} alt={alt || inputSrc} loading="lazy" />
  );
}
