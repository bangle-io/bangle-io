import { Manager } from '@bangle.dev/collab-server';
import { DebouncedDisk } from '@bangle.dev/disk';
import { sleep } from '@bangle.dev/utils';

import { pageSlice, setPageLifeCycleState } from '@bangle.io/slice-page';
import {
  createExtensionRegistry,
  createTestStore,
} from '@bangle.io/test-utils';

import { editorManagerSlice } from '../worker-editor-slice';

const extensionRegistry = createExtensionRegistry([], { editorCore: true });

jest.mock('../../common', () => {
  const rest = jest.requireActual('../../common');
  return {
    ...rest,
    DOC_WRITE_DEBOUNCE_WAIT: 0,
    DOC_WRITE_DEBOUNCE_MAX_WAIT: 0,
  };
});

describe('slice', () => {
  test('works', async () => {
    const slice = editorManagerSlice();
    const { store } = createTestStore({
      slices: [slice, pageSlice()],
      opts: {
        extensionRegistry,
      },
    });

    expect(slice.getSliceState(store.state)?.disk).toBeInstanceOf(
      DebouncedDisk,
    );
    expect(slice.getSliceState(store.state)?.editorManager).toBeInstanceOf(
      Manager,
    );
    store.destroy();
  });
});

describe('flushNaukarEffect', () => {
  test('works when transitioned to frozen', async () => {
    const slice = editorManagerSlice();

    const { store } = createTestStore({
      slices: [slice, pageSlice()],
      opts: {
        extensionRegistry,
      },
    });

    const disk = slice.getSliceState(store.state)!.disk;
    const flushSpy = jest.spyOn(disk!, 'flushAll');
    expect(disk).toBeTruthy();

    setPageLifeCycleState('frozen', 'active')(store.state, store.dispatch);

    await sleep(0);

    expect(flushSpy).toHaveBeenCalledTimes(1);
    store.destroy();
  });

  test('when transitioned to active', async () => {
    const slice = editorManagerSlice();

    const { store } = createTestStore({
      slices: [slice, pageSlice()],
      opts: {
        extensionRegistry,
      },
    });

    const disk = slice.getSliceState(store.state)!.editorManager;
    const destroySpy = jest.spyOn(disk!, 'destroy');
    expect(disk).toBeTruthy();

    setPageLifeCycleState('active', 'passive')(store.state, store.dispatch);

    await sleep(0);

    expect(destroySpy).toHaveBeenCalledTimes(1);
    store.destroy();
  });
});
