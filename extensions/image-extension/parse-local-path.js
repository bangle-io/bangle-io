import { filePathToWsPath, resolvePath } from 'workspace';

// wsPath must be a file wsPath
export function parseLocalPath(imageSrc, wsPath) {
  if (imageSrc.startsWith('./')) {
    imageSrc = imageSrc.slice(2);
  }
  const { wsName, filePath } = resolvePath(wsPath);
  const splitted = filePath.split('/');
  const dirPath = splitted.slice(0, splitted.length - 1).join('/');
  let sampleDomain = 'https://bangle.io';
  if (dirPath) {
    sampleDomain += '/' + dirPath + '/';
  }
  let imageFilePath = new URL(imageSrc, sampleDomain).pathname;

  if (imageFilePath.startsWith('/')) {
    imageFilePath = imageFilePath.slice(1);
  }
  return filePathToWsPath(wsName, imageFilePath);
}
