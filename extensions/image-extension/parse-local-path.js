import { filePathToWsPath, resolvePath } from 'workspace';

/**
 * @param {String} imageSrc - The image source read directly form the user input like an md file
 * @param {String} wsPath - the current file wsPath to resolve the imageSrc from
 * @returns {String} a wsPath to the image file
 */
export function parseLocalPath(imageSrc, wsPath) {
  if (imageSrc.startsWith('./')) {
    imageSrc = imageSrc.slice(2);
  }
  const { wsName, dirPath } = resolvePath(wsPath);
  let sampleDomain = 'https://bangle.io';
  if (dirPath) {
    sampleDomain += '/' + dirPath + '/';
  }
  let imageFilePath = new URL(imageSrc, sampleDomain).pathname;

  if (imageFilePath.startsWith('/')) {
    imageFilePath = imageFilePath.slice(1);
  }
  // need to decode uri as filesystems dont do encoding
  return filePathToWsPath(wsName, decodeURIComponent(imageFilePath));
}
