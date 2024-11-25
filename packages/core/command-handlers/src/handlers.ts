import { throwAppError } from '@bangle.io/base-utils';
import { filePathToWsPath, resolvePath } from '@bangle.io/ws-path';
import { c } from './helper';

export const commandHandlers = [
  c('command::ui:test-no-use', (_) => {}),

  c(
    'command::ws:new-note-from-input',
    ({ fileSystem, navigation }, { inputPath }) => {
      if (typeof inputPath !== 'string') {
        throwAppError('error::ws-path:create-new-note', 'Invalid note path', {
          invalidWsPath: inputPath,
        });
      }
      if (
        inputPath.endsWith('/') ||
        inputPath.endsWith('/.md') ||
        inputPath.trim() === ''
      ) {
        throwAppError('error::ws-path:create-new-note', 'Invalid note path', {
          invalidWsPath: inputPath,
        });
      }
      if (inputPath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(inputPath)) {
        throwAppError(
          'error::ws-path:create-new-note',
          'Absolute paths are not allowed',
          {
            invalidWsPath: inputPath,
          },
        );
      }

      if (inputPath.includes('../') || inputPath.includes('..\\')) {
        throwAppError(
          'error::ws-path:create-new-note',
          'Directory traversal is not allowed',
          {
            invalidWsPath: inputPath,
          },
        );
      }

      // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
      const invalidChars = /[<>:"\/\\|?*\x00-\x1F]/g;
      if (invalidChars.test(inputPath)) {
        throwAppError(
          'error::ws-path:create-new-note',
          'Invalid characters in path',
          {
            invalidWsPath: inputPath,
          },
        );
      }

      const maxPathLength = 255;
      if (inputPath.length > maxPathLength) {
        throwAppError(
          'error::ws-path:create-new-note',
          'Path exceeds maximum length',
          {
            invalidWsPath: inputPath,
          },
        );
      }

      const { wsName } = navigation.resolveAtoms();

      if (!wsName) {
        throwAppError('error::ws-path:create-new-note', 'No workspace open', {
          invalidWsPath: inputPath,
        });
      }
      if (!inputPath.endsWith('.md')) {
        inputPath = `${inputPath}.md`;
      }
      const newWsPath = filePathToWsPath(wsName, inputPath);

      const { fileNameWithoutExt } = resolvePath(newWsPath);

      void fileSystem.createFile(
        newWsPath,
        new File(
          [`I am content of ${fileNameWithoutExt}`],
          fileNameWithoutExt,
          {
            type: 'text/plain',
          },
        ),
      );
    },
  ),
];
