const pathValidRegex = /^[0-9a-zA-Z_\-. /:=',()–!\+\[\]]+$/;
const last = (arr) => arr[arr.length - 1];

export function validWsName(wsName) {
  if (wsName.includes(':')) {
    throw new Error(
      'Invalid wsName "' + wsName + '" . Please avoid using special characters',
    );
  }
}

export function validatePath(wsPath) {
  if (
    !pathValidRegex.test(wsPath) ||
    wsPath.split('/').some((r) => r.length === 0)
  ) {
    throw new Error('Invalid path ' + wsPath);
  }

  if ((wsPath.match(/:/g) || []).length !== 1) {
    throw new Error('Path must have only 1 :');
  }

  const [wsName, filePath] = wsPath.split(':');
  if (!wsName || !filePath) {
    throw new Error('Invalid wsPath ' + wsPath);
  }
  if (filePath.endsWith('/.md') || filePath === '.md') {
    throw new Error('Invalid wsPath ' + wsPath);
  }
}

export function validateWsFilePath(wsPath) {
  validatePath(wsPath);
  const { fileName } = resolvePath(wsPath);
  if (!fileName.includes('.')) {
    throw new Error(`Filename ${fileName} must have "." extension.`);
  }
}

export function resolvePath(wsPath) {
  validatePath(wsPath);
  const [wsName, filePath] = wsPath.split(':');
  const fileName = last(filePath.split('/'));

  return {
    wsName,
    filePath,
    fileName: fileName,
  };
}

export function locationToFilePath(location) {
  if (location) {
    return location.pathname.split('/').slice(3).join('/');
  }
  return null;
}
