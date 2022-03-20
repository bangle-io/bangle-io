/**
 * @jest-environment jsdom
 */
import { act, render } from '@testing-library/react';
import React from 'react';

import { Extension } from '../Extension';
import { ExtensionRegistry } from '../ExtensionRegistry';
import { useExtensionRegistryContext } from '../ExtensionRegistryContext';
import {
  ExtensionStateContextProvider,
  useExtensionState,
} from '../ExtensionStateContext';

jest.mock('../ExtensionRegistryContext', () => {
  const actual = jest.requireActual('../ExtensionRegistryContext');

  return {
    ...actual,
    useExtensionRegistryContext: jest.fn(),
  };
});

beforeEach(() => {});

const useExtensionRegistryContextMock =
  useExtensionRegistryContext as jest.MockedFunction<
    typeof useExtensionRegistryContext
  >;

test('state is intialized', () => {
  useExtensionRegistryContextMock.mockImplementation(() => {
    return new ExtensionRegistry([
      Extension.create({
        name: 'my-ext',
        initialState: { test: 123 },
      }),
    ]);
  });
  let receivedState;
  function MyComp() {
    const [state] = useExtensionState('my-ext');
    receivedState = state;

    return <span>hi</span>;
  }

  act(() => {
    render(
      <ExtensionStateContextProvider>
        <MyComp />
      </ExtensionStateContextProvider>,
    );
  });

  expect(receivedState).toEqual({ test: 123 });
});

test('forwards correct state to each extension', () => {
  useExtensionRegistryContextMock.mockImplementation(() => {
    return new ExtensionRegistry([
      Extension.create({
        name: 'my-ext-1',
        initialState: { test: 123 },
      }),
      Extension.create({
        name: 'my-ext-2',
        initialState: { magic: 'balls' },
      }),
    ]);
  });

  let receivedState1,
    receivedState2,
    updateState2: ReturnType<typeof useExtensionState>[1];

  let comp1RenderCount = 0;
  let comp1UniqueUpdateCalls = new Set();
  let comp1UniqueStates = new Set();

  function MyComp1() {
    const [state, update] = useExtensionState('my-ext-1');

    comp1RenderCount++;
    receivedState1 = state;
    comp1UniqueStates.add(state);
    comp1UniqueUpdateCalls.add(update);

    return <span>hi</span>;
  }

  function MyComp2() {
    const [state, update] = useExtensionState('my-ext-2');
    receivedState2 = state;
    updateState2 = update;

    return <span>hi</span>;
  }

  act(() => {
    render(
      <ExtensionStateContextProvider>
        <>
          <MyComp1 />
          <MyComp2 />
        </>
      </ExtensionStateContextProvider>,
    );
  });

  expect(receivedState1).toEqual({ test: 123 });
  expect(receivedState2).toEqual({ magic: 'balls' });

  expect(comp1UniqueStates.size).toBe(1);
  expect(comp1UniqueUpdateCalls.size).toBe(1);
  expect(comp1RenderCount).toBe(1);

  act(() => {
    updateState2({ magic: 'magical' });
  });

  expect(receivedState1).toEqual({ test: 123 });
  expect(receivedState2).toEqual({ magic: 'magical' });

  // To make sure the references stay the same
  expect(comp1UniqueStates.size).toBe(1);
  expect(comp1UniqueUpdateCalls.size).toBe(1);
  // Unfortunately the way hooks work, the component
  // we be rerendered even if the output of hook
  // stays the same
  expect(comp1RenderCount).toBe(2);
});
