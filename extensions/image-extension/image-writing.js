import { IMAGE_SAVE_DIR } from './config';
import { filePathToWsPath, resolvePath } from 'workspace/index';
import { setImageMetadataInWsPath } from './image-file-helpers';

/**
 *
 * @param {*} fileName  - the filename name of the image
 * @param {*} wsName - the current wsName
 * @param {*} dimensions - the the widthxheight of the image
 * @param {Boolean} timestamp - whether to add timestamp in the fileName for uniqueness. If fileName already has one it will be updated
 * @returns - a wsPath and srcUrl for the image
 */
export async function createImage(fileName, wsName, dimensions, timestamp) {
  let imageWsPath = filePathToWsPath(wsName, IMAGE_SAVE_DIR + '/' + fileName);

  imageWsPath = await setImageMetadataInWsPath(imageWsPath, dimensions, true);
  // pre-pending a / to make it an absolute URL
  // since we are returning a web url we need to encode it
  return {
    wsPath: imageWsPath,
    srcUrl: encodeURI('/' + resolvePath(imageWsPath).filePath),
  };
}
