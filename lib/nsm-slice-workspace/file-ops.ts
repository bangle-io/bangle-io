import type {
  ExtensionRegistry,
  Node,
  WsName,
  WsPath,
} from '@bangle.io/shared-types';
import { fs } from '@bangle.io/workspace-info';
import { resolvePath2 } from '@bangle.io/ws-path';

import { defaultDoc } from './default-doc';
import { markdownFormatProvider } from './note-format';

export async function createNote(
  wsPath: WsPath,
  extensionRegistry: ExtensionRegistry,
  doc?: Node,
) {
  if (doc == null) {
    doc = defaultDoc(wsPath, extensionRegistry);
  }

  await writeNote(wsPath, extensionRegistry, doc);
}

export async function writeNote(
  wsPath: WsPath,
  extensionRegistry: ExtensionRegistry,
  doc: Node,
) {
  const { wsName, fileName } = resolvePath2(wsPath);

  const serialValue = getNoteFormatProvider(wsName).serializeNote(
    doc,
    extensionRegistry.specRegistry,
    fileName,
  );

  await fs.writeFile(
    wsPath,
    new File([serialValue], fileName, {
      type: 'text/plain',
    }),
  );
}

export async function getNote(
  wsPath: WsPath,
  extensionRegistry: ExtensionRegistry,
) {
  const textContent = await fs.readFileAsText(wsPath);

  if (!textContent) {
    return undefined;
  }
  const { wsName } = resolvePath2(wsPath);

  const doc = getNoteFormatProvider(wsName).parseNote(
    textContent,
    extensionRegistry.specRegistry,
    extensionRegistry.markdownItPlugins,
  );

  return doc;
}

function getNoteFormatProvider(wsName: WsName) {
  // TODO implement custom format provider
  let provider = markdownFormatProvider;

  if (!provider) {
    throw new Error('Note storage provider not found.');
  }

  return provider;
}
