export function splitWsPath(wsPath: string): [string, string] {
  const [wsName, filePath] = wsPath.split(':');

  if (!wsName) {
    throw new Error('Invalid wsName');
  }

  if (!filePath) {
    throw new Error('Invalid filePath');
  }

  return [wsName, filePath];
}

export function getLast<T>(array: T[]): T | undefined {
  return array[array.length - 1];
}

export function removeExtension(str: string) {
  if (str.endsWith('.md')) {
    return str.slice(0, -3);
  }

  return str;
}

export function resolvePath(wsPath: string) {
  //x TODO currently this only works for fileWsPaths
  const [wsName, filePath] = splitWsPath(wsPath);
  const filePathSplitted = filePath.split('/');

  const fileName: string | undefined = getLast(filePathSplitted);

  if (typeof fileName !== 'string') {
    throw new Error('fileName undefined');
  }

  const dirPath = filePathSplitted
    .slice(0, filePathSplitted.length - 1)
    .filter(Boolean)
    .join('/');

  return {
    wsName,
    filePath, // wsName:filePath
    dirPath, // wsName:dirPath/fileName
    fileName,
    fileNameWithoutExt: removeExtension(fileName),
  };
}

export function filePathToWsPath(wsName: string, filePath: string) {
  if (filePath.startsWith('/')) {
    filePath = filePath.slice(1);
  }

  return wsName + ':' + filePath;
}
