import { BrowserHistory } from '@bangle.io/history';
import { sleep } from '@bangle.io/utils';

import { createStore, lifeCycleMock } from './test-utils';

beforeEach(() => {
  lifeCycleMock.addEventListener.mockImplementation(() => {});
  lifeCycleMock.removeEventListener.mockImplementation(() => {});
});

describe('watchHistoryEffect', () => {
  test('initializes & destroys correctly', async () => {
    jest.useFakeTimers();
    const { actionsDispatched } = createStore();

    expect(actionsDispatched).toContainEqual({
      id: expect.anything(),
      name: 'action::@bangle.io/slice-page:history-set-history',
      value: {
        history: expect.any(BrowserHistory),
      },
    });

    window.history.pushState(null, '', '/ws/foo');

    jest.runAllTimers();

    // expect(actionsDispatched).toHaveLength(2);
    expect(actionsDispatched).toContainEqual({
      id: expect.anything(),
      name: 'action::@bangle.io/slice-page:history-update-location',
      value: {
        location: {
          pathname: '/ws/foo',
          search: '',
        },
      },
    });
  });
});
