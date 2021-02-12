import React from 'react';
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom';

import { useCreateMdFile } from '../workspace-hooks';
import { render, act } from '@testing-library/react';
import * as idb from 'idb-keyval';

jest.mock('idb-keyval', () => {
  return {
    get: jest.fn(),
    del: jest.fn(),
    set: jest.fn(),
    keys: jest.fn(),
  };
});

describe('useCreateMdFile', () => {
  test('browser create file', async () => {
    let callback;

    idb.get.mockImplementation((key) => {
      if (key === 'workspaces/2') {
        return [
          {
            name: 'kujo',
            type: 'browser',
            metadata: {},
          },
        ];
      }
    });

    function Comp() {
      const createMdFile = useCreateMdFile();
      callback = createMdFile;
      return <div>Hello</div>;
    }

    await render(
      <Router initialEntries={['/ws/kujo']}>
        <Switch>
          <Route path={['/ws/:wsName']}>
            <Comp />
          </Route>
        </Switch>
      </Router>,
    );

    expect(callback).not.toBeUndefined();

    const result = callback('kujo:one.md');
    expect(result).toBeInstanceOf(Promise);

    await result;

    expect(idb.set).toBeCalledTimes(1);
    expect(idb.set).toBeCalledWith('kujo:one.md', {
      doc: {
        content: [
          {
            attrs: { level: 1 },
            content: [{ text: 'one.md', type: 'text' }],
            type: 'heading',
          },
          {
            content: [{ text: 'Hello world!', type: 'text' }],
            type: 'paragraph',
          },
        ],
        type: 'doc',
      },
      name: 'one.md',
    });
  });
});
