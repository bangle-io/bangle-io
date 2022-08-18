import { deepMap } from '@bangle.io/deep-map';

/**
 * We use fake-indexeddb to mock the IndexedDB API.
 * It does not work well with File and Blobs, so we use the following methods
 * to convert them to ArrayBuffers.
 */
interface IdbFriendlyFile {
  __file__: true;
  filename: string;
  arrayBuffer: ArrayBuffer;
  properties?: FilePropertyBag;
}

export function hydrateFileInstance(obj: any) {
  return deepMap(obj, (val) => {
    if (val?.__file__) {
      let v: IdbFriendlyFile = val;

      return new File([new Blob([v.arrayBuffer])], v.filename, v.properties);
    }

    return val;
  });
}

export async function pacifyFileInstance(obj: any) {
  let promises: ArrayBuffer[] = [];

  let bufferMapping = new Map();

  let firstPass = deepMap(obj, (val) => {
    if (val instanceof File) {
      let bufferPromise = (val as any).parts[0].arrayBuffer();
      promises.push(bufferPromise);

      bufferPromise.then((buffer: any) => {
        bufferMapping.set(bufferPromise, buffer);
      });

      const { filename, properties } = val as any;

      let serialized: IdbFriendlyFile = {
        __file__: true,
        filename,
        arrayBuffer: bufferPromise,
        properties,
      };

      return serialized;
    }

    return val;
  });

  await Promise.all(promises);

  return deepMap(firstPass, (val) => {
    if (bufferMapping.has(val)) {
      const match = bufferMapping.get(val);

      if (!match) {
        throw new Error('No match found');
      }

      return match;
    }

    return val;
  });
}
