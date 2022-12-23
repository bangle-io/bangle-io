/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';

import { useSliceState } from '@bangle.io/bangle-store-context';
import type { NotificationPayloadType } from '@bangle.io/shared-types';
import { sleep } from '@bangle.io/utils';

import { NotificationArea } from '../NotificationArea';

jest.mock('@bangle.io/bangle-store-context', () => {
  return { useSliceState: jest.fn() };
});

const useSliceStateMock = jest.mocked(useSliceState);

beforeEach(() => {
  useSliceStateMock.mockImplementation(() => ({
    store: { dispatch: jest.fn(), state: {} } as any,
    sliceState: { notifications: [] },
    dispatch: jest.fn(),
  }));
});

describe('NotificationArea', () => {
  test('renders empty', async () => {
    const result = await render(<NotificationArea />);

    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          class="fixed bottom-0 right-0 z-50"
        />
      </div>
    `);
  });

  test('renders with content', async () => {
    const uiDispatchMock = jest.fn();
    let notificationsObj: { notifications: NotificationPayloadType[] } = {
      notifications: [],
    };
    useSliceStateMock.mockImplementation(() => ({
      store: { dispatch: uiDispatchMock, state: {} } as any,
      sliceState: { notifications: notificationsObj.notifications },
      dispatch: jest.fn(),
    }));

    const result = await render(<NotificationArea />);

    expect(result.container).toMatchInlineSnapshot(`
      <div>
        <div
          class="fixed bottom-0 right-0 z-50"
        />
      </div>
    `);

    notificationsObj.notifications = [
      { uid: 'one', title: 'Title', content: 'hello you!' },
    ];

    expect(useSliceState).toBeCalledTimes(1);

    await result.rerender(<NotificationArea />);

    expect(useSliceState).toBeCalledTimes(2);
    expect(result.container.innerHTML.includes('hello you')).toBe(true);

    notificationsObj.notifications = [
      { uid: 'one', content: 'hello you!', title: 'Title One' },
      {
        title: 'Title Two',
        uid: 'second',
        content: 'second!',
        buttons: [
          {
            operation: 'operation::@bangle.io/test:something',
            title: 'Test Op',
            dismissOnClick: true,
            hint: 'test-btn',
          },
        ],
      },
    ];

    await result.rerender(<NotificationArea />);
    expect(useSliceState).toBeCalledTimes(3);

    expect(result.container.innerHTML.includes('hello you')).toBe(true);
    expect(result.container.innerHTML.includes('second!')).toBe(true);

    expect(result.container).toMatchSnapshot();

    expect(uiDispatchMock).toBeCalledTimes(0);

    fireEvent.click(result.getByLabelText('test-btn'));

    // should dismiss the notification since `dismissOnClick` is true
    expect(uiDispatchMock).toBeCalledTimes(1);
    expect(uiDispatchMock).toHaveBeenCalledWith({
      name: 'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION',
      value: { uids: ['second'] },
    });
  });

  test('removes notification on clicking', async () => {
    const uiDispatchMock = jest.fn();
    let notificationsObj: { notifications: NotificationPayloadType[] } = {
      notifications: [],
    };
    useSliceStateMock.mockImplementation(() => ({
      store: { dispatch: uiDispatchMock, state: {} } as any,
      dispatch: jest.fn(),
      sliceState: { notifications: notificationsObj.notifications },
    }));
    const result = await render(<NotificationArea />);

    notificationsObj.notifications = [
      { uid: 'one', title: 'title', content: 'hello you!' },
    ];

    await result.rerender(<NotificationArea />);
    expect(useSliceState).toBeCalledTimes(2);

    expect(result.container.innerHTML.includes('hello you')).toBe(true);

    const prom = sleep();
    fireEvent.click(result.getByLabelText('dismiss notification'));
    await act(() => prom);

    expect(uiDispatchMock).toBeCalledTimes(1);
    expect(uiDispatchMock).nthCalledWith(1, {
      name: 'action::@bangle.io/slice-notification:DISMISS_NOTIFICATION',
      value: {
        uids: ['one'],
      },
    });
  });
});
