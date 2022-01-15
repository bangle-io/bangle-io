import {
  ApplicationStore,
  AppState,
  Slice,
  SliceSideEffect,
} from '@bangle.io/create-store';
import { pageLifeCycleTransitionedTo } from '@bangle.io/slice-page';
import { shallowOrderedArrayCompare } from '@bangle.io/utils';
import { naukarWorkerProxy } from '@bangle.io/worker-naukar-proxy';

import { flushNaukarEffect } from '../bangle-slices';

jest.mock('@bangle.io/worker-naukar-proxy', () => {
  return {
    naukarWorkerProxy: { resetManager: jest.fn(), flushDisk: jest.fn() },
  };
});
jest.mock('@bangle.io/slice-page', () => {
  const actual = jest.requireActual('@bangle.io/slice-page');
  return {
    ...actual,
    pageLifeCycleTransitionedTo: jest.fn(() => {
      return () => false;
    }),
  };
});

const createStore = (sideEffect: SliceSideEffect<any, any>[]) => {
  const store = ApplicationStore.create({
    scheduler: (cb) => {
      cb();
      return () => {};
    },
    storeName: 'editor-store',
    state: AppState.create({
      slices: [
        new Slice({
          sideEffect: sideEffect,
        }),
      ],
    }),
  });

  const dispatchSpy = jest.spyOn(store, 'dispatch');

  return { store, dispatchSpy };
};

const pageLifeCycleTransitionedToMock =
  pageLifeCycleTransitionedTo as jest.MockedFunction<
    typeof pageLifeCycleTransitionedTo
  >;

beforeEach(() => {
  pageLifeCycleTransitionedToMock.mockImplementation(() => () => false);
});

describe('flushNaukarEffect', () => {
  test('works when transitioned to active', () => {
    const pageLifeMock = jest.fn(() => true);

    pageLifeCycleTransitionedToMock.mockImplementation((lifecycle) => {
      if (lifecycle === 'active') {
        return pageLifeMock;
      }
      return () => {
        return false;
      };
    });

    let { store } = createStore([flushNaukarEffect]);

    store.dispatch({
      name: 'action::some-action',
      value: 'blah',
    });

    expect(pageLifeMock).toBeCalledTimes(1);

    expect(naukarWorkerProxy.resetManager).toBeCalledTimes(1);
    expect(naukarWorkerProxy.flushDisk).toBeCalledTimes(0);
  });

  test('flushDisk testing', () => {
    const pageLifeMock = jest.fn(() => true);
    pageLifeCycleTransitionedToMock.mockImplementation((lifecycle) => {
      if (
        Array.isArray(lifecycle) &&
        shallowOrderedArrayCompare(
          ['passive', 'terminated', 'frozen', 'hidden'],
          lifecycle,
        )
      ) {
        return pageLifeMock;
      }
      return () => {
        return false;
      };
    });

    let { store } = createStore([flushNaukarEffect]);

    store.dispatch({
      name: 'action::some-action',
      value: 'blah',
    });

    expect(pageLifeMock).toBeCalledTimes(1);

    expect(naukarWorkerProxy.resetManager).toBeCalledTimes(0);
    expect(naukarWorkerProxy.flushDisk).toBeCalledTimes(1);
  });
});
