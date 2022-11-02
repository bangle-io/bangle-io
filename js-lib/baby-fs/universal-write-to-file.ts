// this exists because it is not possible to write to a fileHandle
// in safari outside of worker context
import { sendToWorkerForWrite } from './worker-glue-code';

const isWorker =
  typeof WorkerGlobalScope !== 'undefined' &&
  // eslint-disable-next-line no-restricted-globals, no-undef
  self instanceof WorkerGlobalScope;

interface WritePayload {
  path: string[];
  content: File | Blob;
}

export async function writeToFile(
  fileHandle: FileSystemFileHandle,
  content: FileSystemWriteChunkType,
  parentHandles: FileSystemDirectoryHandle[],
) {
  if (!(content instanceof File || content instanceof Blob)) {
    throw new Error('Not correct type of content');
  }
  // Support for Chrome 82 and earlier.
  if ((fileHandle as any).createWriter) {
    // Create a writer (request permission if necessary).
    const writer = await (fileHandle as any).createWriter();
    // Write the full length of the contents
    await writer.write(0, content);
    // Close the file and write the contents to disk
    await writer.close();

    return;
  }

  // For Chrome 83 and later.
  if (fileHandle.createWritable) {
    // Create a FileSystemWritableFileStream to write to.
    const writable = await fileHandle.createWritable();

    // TODO this throws a promise rejection internally, not sure
    // if this the root cause of the crswap issue
    // Write the contents of the file to the stream.
    await writable.write(content);

    // Close the file and write the contents to disk.
    await writable.close();

    return;
  }

  // for Safari 15.2 and later which support private fs
  // and it does not allow writing to fileHandle outside of worker
  if (
    navigator &&
    navigator.storage &&
    'getDirectory' in navigator.storage &&
    isSafari()
  ) {
    // Safari does not allow forwarding file handlers to worker context
    let path = parentHandles.map((h) => h.name);
    path.push(fileHandle.name);

    if (isWorker) {
      await safariWorkerWrite({ path, content });
    } else {
      await sendToWorkerForWrite(safariWorkerWrite, { path, content });
    }

    return;
  }

  throw new Error('No write method available');
}

async function safariWorkerWrite({ path, content }: WritePayload) {
  const rootDirHandle = await navigator.storage.getDirectory();

  let handle = rootDirHandle;

  for (const p of path.slice(0, path.length - 1)) {
    handle = await handle.getDirectoryHandle(p, { create: false });

    if (!handle) {
      throw new Error(`Dir handle ${p} not found`);
    }
  }

  let fileHandle = await handle.getFileHandle(path[path.length - 1]!, {
    create: false,
  });

  if (!fileHandle) {
    throw new Error(`File handle ${path.join('/')} not found`);
  }

  const accessHandle = await (fileHandle as any).createSyncAccessHandle();
  let writeBuffer = await new Response(content).arrayBuffer();

  await accessHandle.write(writeBuffer, { at: 0 });
  // We have to truncate the file to the size of the new content
  // or else older content will persist
  await accessHandle.truncate(content.size);
  await accessHandle.flush();
  await accessHandle.close();
}

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
