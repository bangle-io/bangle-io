/**
 * @jest-environment jsdom
 */
/** @jsx psx */
/// <reference path="../../../missing-test-types.d.ts" />
/// <reference path="./missing-test-types.d.ts" />

import { act, renderHook } from '@testing-library/react-hooks';

import { defaultPlugins, defaultSpecs } from '@bangle.dev/all-base-components';
import { SpecRegistry } from '@bangle.dev/core';
import type { Node } from '@bangle.dev/pm';
import { psx, renderTestEditor } from '@bangle.dev/test-helpers';

import { getUseWorkspaceContextReturn } from '@bangle.io/test-utils/function-mock-return';
import { sleep } from '@bangle.io/utils';
import { getNote, useWorkspaceContext } from '@bangle.io/workspace-context';

import { editorTagSpec } from '../editor-tag';
import { _listTags, listAllTags, useSearchAllTags } from '../search';

let getNoteMock = getNote as jest.MockedFunction<typeof getNote>;

jest.mock('@bangle.io/workspace-context', () => {
  const workspaceThings = jest.requireActual('@bangle.io/workspace-context');
  return {
    ...workspaceThings,
    bangleStore: {
      state: {},
      dispatch: {},
    },
    getNote: jest.fn(() => async () => {}),
    useWorkspaceContext: jest.fn(),
  };
});

const specRegistry = new SpecRegistry([...defaultSpecs(), editorTagSpec()]);
const testEditor = renderTestEditor({
  specRegistry,
  plugins: defaultPlugins(),
});

let useWorkspaceContextMock = useWorkspaceContext as jest.MockedFunction<
  typeof useWorkspaceContext
>;

beforeEach(() => {
  getNoteMock.mockImplementation(() => async () => undefined);

  useWorkspaceContextMock.mockImplementation(() => {
    return {
      ...getUseWorkspaceContextReturn,
    };
  });
});

describe('search tag in a doc', () => {
  test('one tag', async () => {
    const { view } = testEditor(
      <doc>
        <para>
          Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    expect([..._listTags(view.state.doc)]).toEqual(['hi']);
  });

  test('two same tag', async () => {
    const { view } = testEditor(
      <doc>
        <para>
          <tag tagValue="hi" /> Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    expect([..._listTags(view.state.doc)]).toEqual(['hi']);
  });

  test('many tags same tag', async () => {
    const { view } = testEditor(
      <doc>
        <para>
          <tag tagValue="hi" /> Hello <tag tagValue="hi2" />
        </para>
        <heading>
          <tag tagValue="bye" /> Hello <tag tagValue="bye2" />
        </heading>
      </doc>,
    );

    expect([..._listTags(view.state.doc)]).toEqual([
      'hi',
      'hi2',
      'bye',
      'bye2',
    ]);
  });
});

describe('search tag across wsPaths', () => {
  test('works', async () => {
    const { view: view1 } = testEditor(
      <doc>
        <para>
          Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    const { view: view2 } = testEditor(
      <doc>
        <para>
          Hello <tag tagValue="second" /> <tag tagValue="third" />
        </para>
      </doc>,
    );

    const { view: view3 } = testEditor(
      <doc>
        <heading>
          Hello <tag tagValue="fourth" /> brah <tag tagValue="fifth" />
        </heading>
      </doc>,
    );

    const controller = new AbortController();
    const signal = controller.signal;
    const callback = jest.fn(async (wsPath) => {
      if (wsPath === 't:1') {
        return view1.state.doc;
      }
      if (wsPath === 't:2') {
        return view2.state.doc;
      }
      if (wsPath === 't:3') {
        return view3.state.doc;
      }
      throw new Error('Unknown wsPath ' + wsPath);
    });

    const tagsSet = await listAllTags(['t:1', 't:2', 't:3'], callback, signal);

    expect(tagsSet).toEqual(['hi', 'second', 'third', 'fourth', 'fifth']);
    expect(callback).toBeCalledTimes(3);
  });

  test('aborts correctly', async () => {
    const { view: view1 } = testEditor(
      <doc>
        <para>
          Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    const { view: view2 } = testEditor(
      <doc>
        <para>
          Hello <tag tagValue="second" /> <tag tagValue="third" />
        </para>
      </doc>,
    );

    const { view: view3 } = testEditor(
      <doc>
        <heading>
          Hello <tag tagValue="fourth" /> brah <tag tagValue="fifth" />
        </heading>
      </doc>,
    );

    const controller = new AbortController();
    const signal = controller.signal;

    const callback = jest.fn(async (wsPath): Promise<Node> => {
      if (wsPath === 't:1') {
        return view1.state.doc;
      }
      if (wsPath === 't:2') {
        controller.abort();
        return new Promise((res) => setTimeout(res, 0)).then(() => {
          return view2.state.doc;
        });
      }
      if (wsPath === 't:3') {
        return view3.state.doc;
      }
      throw new Error('Unknown wsPath ' + wsPath);
    });
    const fun = () => listAllTags(['t:1', 't:2', 't:3'], callback, signal);

    await expect(fun()).rejects.toThrowErrorMatchingInlineSnapshot(`"Aborted"`);
    expect(callback).toBeCalledTimes(2);
  });
});

describe('useSearchAllTags', () => {
  let abortSpy;
  let delayGetNotes = false;

  beforeEach(() => {
    abortSpy = jest.spyOn(AbortController.prototype, 'abort');
  });
  afterEach(() => {
    delayGetNotes = false;
    abortSpy.mockRestore();
  });

  beforeEach(() => {
    const { view: view1 } = testEditor(
      <doc>
        <para>
          Hello <tag tagValue="hi" />
        </para>
      </doc>,
    );

    const { view: view2 } = testEditor(
      <doc>
        <para>
          Hello <tag tagValue="second" /> <tag tagValue="third" />
        </para>
      </doc>,
    );

    const { view: view3 } = testEditor(
      <doc>
        <heading>
          Hello <tag tagValue="fourth" /> brah <tag tagValue="fifth" />
        </heading>
      </doc>,
    );
    getNoteMock.mockImplementation((wsPath) => async () => {
      if (delayGetNotes) {
        await sleep(20);
      }
      if (wsPath === 't:1') {
        return view1.state.doc;
      }
      if (wsPath === 't:2') {
        return view2.state.doc;
      }
      if (wsPath === 't:3') {
        return view3.state.doc;
      }
      throw new Error('Unknown wsPath ' + wsPath);
    });

    const noteWsPaths = ['t:1', 't:2', 't:3'];
    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        noteWsPaths: noteWsPaths,
      };
    });
  });

  test('works', async () => {
    let result, waitForNextUpdate;
    act(() => {
      ({ result, waitForNextUpdate } = renderHook(() =>
        useSearchAllTags('', true),
      ));
    });

    await waitForNextUpdate();
    expect(result.current).toEqual([
      'hi',
      'third',
      'fifth',
      'second',
      'fourth',
    ]);
  });

  test('no result when not visible', async () => {
    let result;
    act(() => {
      ({ result } = renderHook(() => useSearchAllTags('', false)));
    });

    expect(result.current).toEqual([]);
  });

  test('filters correctly', async () => {
    let result, waitForNextUpdate;
    act(() => {
      ({ result, waitForNextUpdate } = renderHook(() =>
        useSearchAllTags('i', true),
      ));
    });

    await waitForNextUpdate();

    expect(abortSpy).toBeCalledTimes(0);

    expect(result.current).toEqual(['hi', 'third', 'fifth']);
  });

  test('aborts correctly', async () => {
    let result, rerender;
    delayGetNotes = true;
    act(() => {
      ({ result, rerender } = renderHook(
        ({ query, visible }) => useSearchAllTags(query, visible),
        {
          initialProps: { query: '', visible: true },
        },
      ));
    });

    rerender({ query: 'i', visible: false });

    expect(abortSpy).toBeCalledTimes(1);

    expect(result.current).toEqual([]);
  });
});
