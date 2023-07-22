import type { WsName } from '@bangle.io/shared-types';
import { filePathToWsPath2, resolvePath2 } from '@bangle.io/ws-path';

import { IMAGE_SAVE_DIR } from './config';
import type { Dimension } from './image-file-helpers';
import { setImageMetadataInWsPath } from './image-file-helpers';

/**
 *
 * @param {*} fileName  - the filename name of the image
 * @param {*} wsName - the current wsName
 * @param {*} dimension - the the widthxheight of the image
 * @param {Boolean} timestamp - whether to add timestamp in the fileName for uniqueness. If fileName already has one it will be updated
 * @returns - a wsPath and srcUrl for the image
 */
export async function createImage(
  fileName: string,
  wsName: WsName,
  dimension: Dimension,
  timestamp?: boolean,
) {
  let imageWsPath = filePathToWsPath2(wsName, IMAGE_SAVE_DIR + '/' + fileName);

  imageWsPath = await setImageMetadataInWsPath(imageWsPath, dimension, true);

  // pre-pending a / to make it an absolute URL
  // since we are returning a web url we need to encode it
  return {
    wsPath: imageWsPath,
    srcUrl: encodeURI('/' + resolvePath2(imageWsPath).filePath),
  };
}
