import * as Comlink from 'comlink';
import { Manager } from '@bangle.dev/collab/server/manager';
import { LocalDisk } from '@bangle.dev/collab/client/local-disk';
import { specRegistry } from './spec-sheet';
import { defaultContent } from '../components/constants';

function setup(callbackObj) {
  return new Manager(specRegistry.schema, {
    disk: localDisk(defaultContent, callbackObj),
  });
}

const callbackObj = {};
const manager = setup(callbackObj);

// eslint-disable-next-line no-restricted-globals
onconnect = function (event) {
  console.log('manager!!!');
  for (const port of event.ports) {
    const create = {
      async handleRequest(getDocWrap, saveDocWrap, ...args) {
        callbackObj.getDoc = getDocWrap;
        callbackObj.saveDoc = saveDocWrap;
        const result = await manager.handleRequest(...args);
        console.log(result);
        return result;
      },
      async destroy() {
        console.log('destroy');
        await manager.destroy();
      },
    };

    console.log(create);
    Comlink.expose(create, port);
  }
};

function localDisk(defaultContent, callbackObj) {
  return new LocalDisk({
    getItem: async (wsPath) => {
      const doc = await callbackObj.getDoc(wsPath);
      if (!doc) {
        return defaultContent;
      }
      console.log({ doc });
      return doc;
    },
    setItem: async (wsPath, doc) => {
      await callbackObj.saveDoc(wsPath, doc.toJSON());
    },
  });
}
