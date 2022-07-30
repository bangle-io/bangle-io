import { AppState } from '@bangle.io/create-store';

import { workerSliceFromNaukarKey } from '../common';
import { workerSliceFromNaukarSlice } from '../worker-slice-from-naukar';

test('blank state', () => {
  let state = AppState.create({ slices: [workerSliceFromNaukarSlice()] });

  expect(
    workerSliceFromNaukarKey.getSliceState(state)?.wsPathsToReset,
  ).toStrictEqual([]);
});

test('reset-editor', () => {
  let state = AppState.create({ slices: [workerSliceFromNaukarSlice()] });

  state = state.applyAction({
    name: 'action::@bangle.io/worker-slice-from-naukar:reset-editor',
    value: {
      wsPaths: ['test-ws:a.md', 'test-ws:b.md'],
    },
  });

  expect(
    workerSliceFromNaukarKey.getSliceState(state)?.wsPathsToReset,
  ).toStrictEqual(['test-ws:a.md', 'test-ws:b.md']);

  state = state.applyAction({
    name: 'action::@bangle.io/worker-slice-from-naukar:reset-editor-done',
    value: {
      wsPaths: ['test-ws:b.md'],
    },
  });

  expect(
    workerSliceFromNaukarKey.getSliceState(state)?.wsPathsToReset,
  ).toStrictEqual(['test-ws:a.md']);
});

test('reset-editor adding duplicate', () => {
  let state = AppState.create({ slices: [workerSliceFromNaukarSlice()] });

  state = state.applyAction({
    name: 'action::@bangle.io/worker-slice-from-naukar:reset-editor',
    value: {
      wsPaths: ['test-ws:a.md', 'test-ws:b.md'],
    },
  });

  expect(
    workerSliceFromNaukarKey.getSliceState(state)?.wsPathsToReset,
  ).toStrictEqual(['test-ws:a.md', 'test-ws:b.md']);

  state = state.applyAction({
    name: 'action::@bangle.io/worker-slice-from-naukar:reset-editor',
    value: {
      wsPaths: ['test-ws:b.md'],
    },
  });

  expect(
    workerSliceFromNaukarKey.getSliceState(state)?.wsPathsToReset,
  ).toStrictEqual(['test-ws:a.md', 'test-ws:b.md']);
});

test('reset-editor-done adding duplicate', () => {
  let state = AppState.create({ slices: [workerSliceFromNaukarSlice()] });

  state = state.applyAction({
    name: 'action::@bangle.io/worker-slice-from-naukar:reset-editor',
    value: {
      wsPaths: ['test-ws:a.md', 'test-ws:b.md', 'test-ws:c.md'],
    },
  });

  state = state.applyAction({
    name: 'action::@bangle.io/worker-slice-from-naukar:reset-editor-done',
    value: {
      wsPaths: ['test-ws:b.md', 'test-ws:c.md'],
    },
  });

  expect(
    workerSliceFromNaukarKey.getSliceState(state)?.wsPathsToReset,
  ).toStrictEqual(['test-ws:a.md']);

  state = state.applyAction({
    name: 'action::@bangle.io/worker-slice-from-naukar:reset-editor-done',
    value: {
      wsPaths: ['test-ws:b.md', 'test-ws:c.md'],
    },
  });

  expect(
    workerSliceFromNaukarKey.getSliceState(state)?.wsPathsToReset,
  ).toStrictEqual(['test-ws:a.md']);

  state = state.applyAction({
    name: 'action::@bangle.io/worker-slice-from-naukar:reset-editor-done',
    value: {
      wsPaths: ['test-ws:a.md'],
    },
  });

  expect(
    workerSliceFromNaukarKey.getSliceState(state)?.wsPathsToReset,
  ).toStrictEqual([]);
});
