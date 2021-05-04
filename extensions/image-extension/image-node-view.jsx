import React, { useState, useEffect } from 'react';
import { getFile, isValidFileWsPath, useWorkspacePath } from 'workspace/index';
import { useDestroyRef } from 'utils/index';
import { parseLocalPath } from './parse-local-path';

export const renderReactNodeView = {
  image: (nodeViewRenderArg) => {
    return <ImageComponent nodeAttrs={nodeViewRenderArg.node.attrs} />;
  },
};

const checkExternalSrc = (src) => {
  return (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('data:image/')
  );
};
export function ImageComponent({ nodeAttrs }) {
  const { src, alt } = nodeAttrs;
  const [imageSrc, updateImageSrc] = useState(null);
  const destroyRef = useDestroyRef();
  const { wsPath } = useWorkspacePath();

  useEffect(() => {
    let imageWsPath;
    let objectUrl;

    if (wsPath) {
      if (checkExternalSrc(src)) {
        updateImageSrc(src);
      } else {
        if (isValidFileWsPath(src)) {
          imageWsPath = src;
        } else {
          imageWsPath = parseLocalPath(src, wsPath);
        }

        getFile(imageWsPath)
          .then((file) => {
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
  }, [src, wsPath, destroyRef]);

  // TODO add height width
  return <img src={imageSrc || '/404.png'} alt={alt || src} loading="lazy" />;
}
