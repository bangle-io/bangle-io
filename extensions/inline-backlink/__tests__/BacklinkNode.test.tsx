import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { EditorDisplayType } from '@bangle.io/constants';
import {
  getEditorPluginMetadataReturn,
  getUseWorkspaceContextReturn,
} from '@bangle.io/test-utils/function-mock-return';
import { getEditorPluginMetadata, sleep } from '@bangle.io/utils';
import {
  createNote,
  pushWsPath,
  useWorkspaceContext,
} from '@bangle.io/workspace-context';

import { BacklinkNode } from '../editor/BacklinkNode';

jest.mock('@bangle.io/workspace-context', () => {
  return {
    ...jest.requireActual('@bangle.io/workspace-context'),
    pushWsPath: jest.fn(),
    createNote: jest.fn(),
    useWorkspaceContext: jest.fn(),
  };
});

jest.mock('@bangle.io/utils', () => {
  return {
    ...jest.requireActual('@bangle.io/utils'),
    getEditorPluginMetadata: jest.fn(),
  };
});

let editorView: any = { state: {} };

const getEditorPluginMetadataMock =
  getEditorPluginMetadata as jest.MockedFunction<
    typeof getEditorPluginMetadata
  >;

const useWorkspaceContextMock = useWorkspaceContext as jest.MockedFunction<
  typeof useWorkspaceContext
>;
const pushWsPathMock = pushWsPath as jest.MockedFunction<typeof pushWsPath>;
const createNoteMock = createNote as jest.MockedFunction<typeof createNote>;

describe('BacklinkNode', () => {
  beforeEach(() => {
    useWorkspaceContextMock.mockImplementation(() => ({
      ...getUseWorkspaceContextReturn,
    }));

    pushWsPathMock.mockImplementation(() => () => true);
    createNoteMock.mockImplementation(() => async () => true);

    getEditorPluginMetadataMock.mockImplementation(() => ({
      ...getEditorPluginMetadataReturn,
      wsPath: 'test-ws:my-current-note.md',
      editorDisplayType: EditorDisplayType.Page,
    }));
  });

  test('renders correctly', async () => {
    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        ...getUseWorkspaceContextReturn,
        noteWsPaths: ['test-ws:some/path.md'],
      };
    });

    const renderResult = render(
      <BacklinkNode
        nodeAttrs={{ path: 'some/path', title: undefined }}
        view={editorView}
      />,
    );

    expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <button
          class="inline-backlink_backlink"
          draggable="false"
        >
          <svg
            class="inline-block"
            stroke="currentColor"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10,5.5V1H3.5a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h11a.5.5,0,0,0,.5-.5V6H10.5A.5.5,0,0,1,10,5.5Z"
            />
            <path
              d="M11,1h.043a.5.5,0,0,1,.3535.1465l3.457,3.457A.5.5,0,0,1,15,4.957V5H11Z"
            />
          </svg>
          <span
            class="inline"
          >
            some/path
          </span>
        </button>
      </div>
    `);
  });

  test('renders title if it exists', async () => {
    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        wsName: 'test-ws',
        noteWsPaths: ['test-ws:some/path.md'],
      };
    });

    const renderResult = render(
      <BacklinkNode
        nodeAttrs={{ path: 'some/path', title: 'monako' }}
        view={editorView}
      />,
    );

    expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <button
          class="inline-backlink_backlink"
          draggable="false"
        >
          <svg
            class="inline-block"
            stroke="currentColor"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10,5.5V1H3.5a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h11a.5.5,0,0,0,.5-.5V6H10.5A.5.5,0,0,1,10,5.5Z"
            />
            <path
              d="M11,1h.043a.5.5,0,0,1,.3535.1465l3.457,3.457A.5.5,0,0,1,15,4.957V5H11Z"
            />
          </svg>
          <span
            class="inline"
          >
            monako
          </span>
        </button>
      </div>
    `);
  });

  test('styles not found notes differently', async () => {
    useWorkspaceContextMock.mockImplementation(() => {
      return {
        ...getUseWorkspaceContextReturn,
        wsName: 'test-ws',
        noteWsPaths: [],
      };
    });

    const renderResult = render(
      <BacklinkNode
        nodeAttrs={{ path: 'some/path', title: 'monako' }}
        view={editorView}
      />,
    );

    expect(renderResult.container.innerHTML).toContain(
      'inline-backlink_backlinkNotFound',
    );

    expect(renderResult.container).toMatchInlineSnapshot(`
      <div>
        <button
          class="inline-backlink_backlink inline-backlink_backlinkNotFound"
          draggable="false"
        >
          <svg
            class="inline-block"
            stroke="currentColor"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10,5.5V1H3.5a.5.5,0,0,0-.5.5v15a.5.5,0,0,0,.5.5h11a.5.5,0,0,0,.5-.5V6H10.5A.5.5,0,0,1,10,5.5Z"
            />
            <path
              d="M11,1h.043a.5.5,0,0,1,.3535.1465l3.457,3.457A.5.5,0,0,1,15,4.957V5H11Z"
            />
          </svg>
          <span
            class="inline"
          >
            monako
          </span>
        </button>
      </div>
    `);
  });

  describe('clicking', () => {
    const clickSetup = async (
      { path, title = 'monako' }: { path: string; title?: string },
      clickOpts?: Parameters<typeof fireEvent.click>[1],
    ) => {
      const renderResult = render(
        <BacklinkNode
          nodeAttrs={{ path, title: 'monako' }}
          view={editorView}
        />,
      );
      const prom = sleep();
      fireEvent.click(renderResult.getByText(/monako/i), clickOpts);

      // wait for the promise in click to resolve
      await act(() => prom);
      return renderResult;
    };

    test('clicks correctly when there is a match', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: ['test-ws:magic/some/path.md'],
        };
      });

      // wait for the promise in click to resolve
      await clickSetup({ path: 'magic/some/path' });

      expect(createNoteMock).toBeCalledTimes(0);

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/some/path.md',
        false,
        false,
      );
    });

    test('picks the top most when there are two matches match', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/note1.md',
            'test-ws:magic/some/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note1' });
      expect(createNoteMock).toBeCalledTimes(0);

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/note1.md',
        false,
        false,
      );
    });

    test('doesnt add md if already there', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/note1.md',
            'test-ws:magic/some/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note1.md' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/note1.md',
        false,
        false,
      );
    });

    test('picks the least nested when there are three matches match', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note1.md',
            'test-ws:magic/some-other/place/dig/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note1' });
      expect(createNoteMock).toBeCalledTimes(0);

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/some/note1.md',
        false,
        false,
      );
    });

    test('fall backs to  case insensitive if no case sensitive match', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: ['test-ws:magic/note1.md'],
        };
      });

      await clickSetup({ path: 'Note1' });
      expect(createNoteMock).toBeCalledTimes(0);

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/note1.md',
        false,
        false,
      );
    });

    test('Get the exact match if it exists', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: ['test-ws:magic/NoTe1.md', 'test-ws:note1.md'],
        };
      });

      await clickSetup({ path: 'NoTe1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/NoTe1.md',
        false,
        false,
      );
    });

    test("doesn't confuse if match ends with same", async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/something-note1.md',
            'test-ws:magic/some-other/place/dig/some-else-note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(1, 'test-ws:note1.md', false, false);
    });

    test('doesnt confuse if a subdirectory path match partially matches 1', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some-other/place/dig/some-else-note1.md',
          ],
        };
      });

      // notice the `tel` and `hotel`
      await clickSetup({ path: 'tel/note1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:tel/note1.md',
        false,
        false,
      );
    });

    test('doesnt confuse if a subdirectory path match partially matches 2', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/tel/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'tel/note1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:tel/note1.md',
        false,
        false,
      );
    });

    test('matches file name', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/tel/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note1' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/tel/note1.md',
        false,
        false,
      );
    });

    test('if no file name match', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/tel/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note2' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(1, 'test-ws:note2.md', false, false);
    });

    test('opens sidebar on shift click', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note1.md',
            'test-ws:magic/some-other/place/dig/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note1' }, { shiftKey: true });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/some/note1.md',
        false,
        true,
      );
    });

    test('opens new tab on shift click', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note1.md',
            'test-ws:magic/some-other/place/dig/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note1' }, { metaKey: true });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/some/note1.md',
        true,
        false,
      );
    });

    test('no click if path validation fails', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: ['test-ws:magic/some/note1.md'],
        };
      });

      const renderResult = await clickSetup({ path: 'note:#:.s2:1' });

      expect(pushWsPathMock).toBeCalledTimes(0);
      expect(renderResult.container.innerHTML).toContain(
        `Invalid link (monako)`,
      );
      expect(renderResult.container).toMatchSnapshot();
    });
    test('if no match still clicks', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note1.md',
            'test-ws:magic/some-other/place/dig/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note2' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(1, 'test-ws:note2.md', false, false);
    });

    test('if no match still clicks 2', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note1.md',
            'test-ws:magic/some-other/place/dig/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'some-place/note2' });

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:some-place/note2.md',
        false,
        false,
      );
    });

    test('matches if path follows local file system style', async () => {
      getEditorPluginMetadataMock.mockImplementation(() => {
        return {
          ...getEditorPluginMetadataReturn,
          wsPath: 'test-ws:magic/hello/beautiful/world.md',
          editorDisplayType: EditorDisplayType.Popup,
        };
      });

      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note2.md',
            'test-ws:magic/hello/beautiful/world.md',
            'test-ws:magic/note2.md',
          ],
        };
      });

      await clickSetup({ path: '../note2' });

      expect(createNoteMock).toBeCalledTimes(0);

      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(
        1,
        'test-ws:magic/hello/note2.md',
        false,
        false,
      );
    });

    test('if no match creates note', async () => {
      useWorkspaceContextMock.mockImplementation(() => {
        return {
          ...getUseWorkspaceContextReturn,
          wsName: 'test-ws',
          noteWsPaths: [
            'test-ws:magic/some-place/hotel/note1.md',
            'test-ws:magic/some/note1.md',
            'test-ws:magic/some-other/place/dig/note1.md',
          ],
        };
      });

      await clickSetup({ path: 'note2' });

      expect(createNoteMock).toBeCalledTimes(1);
      expect(createNoteMock).nthCalledWith(1, 'test-ws:note2.md', {
        open: false,
      });
      expect(pushWsPathMock).toBeCalledTimes(1);
      expect(pushWsPathMock).nthCalledWith(1, 'test-ws:note2.md', false, false);
    });
  });
});
