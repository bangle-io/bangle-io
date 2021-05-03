import React, { useState, useEffect } from 'react';
import {
  getImageAsBlob,
  isValidFileWsPath,
  useWorkspacePath,
} from 'workspace/index';
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
  const { wsPath } = useWorkspacePath();
  const destroyRef = useDestroyRef();

  useEffect(() => {
    let imageWsPath;
    let fileBlob;
    if (checkExternalSrc(src)) {
      updateImageSrc(src);
    } else {
      if (isValidFileWsPath(src)) {
        imageWsPath = src;
      } else {
        imageWsPath = parseLocalPath(src, wsPath);
      }

      getImageAsBlob(imageWsPath)
        .then((_fileBlob) => {
          fileBlob = _fileBlob;
          if (!destroyRef.current) {
            updateImageSrc(_fileBlob);
          }
        })
        .catch((error) => {
          // silence the error in case we were not able
          // to get the image
        });
    }
    return () => {
      if (fileBlob) {
        window.URL.revokeObjectURL(fileBlob);
      }
    };
  }, [src, wsPath, destroyRef]);

  useEffect(() => {
    if (imageSrc && imageSrc.startsWith('blob:')) {
    }
  }, [imageSrc]);

  // TODO show filler image
  return <img src={imageSrc} alt={alt} />;
}
