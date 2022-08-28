/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, renderHook } from '@testing-library/react-hooks';

import {
  trimRecords,
  updateRecords,
  updateTimestamps,
  useRecencyMonitor,
} from '../use-recency-monitor';

let originalDateNow = Date.now;

beforeEach(() => {
  Date.now = jest.fn();
});

afterEach(() => {
  Date.now = originalDateNow;
});

describe('helper functions', () => {
  describe('updateTimestamps', () => {
    test('works', () => {
      (Date.now as any).mockImplementation(() => 5);
      expect(updateTimestamps([1, 2, 3], 3)).toEqual([5, 3, 2]);

      (Date.now as any).mockImplementation(() => 5);
      expect(updateTimestamps([1, 2, 3], 4)).toEqual([5, 3, 2, 1]);

      (Date.now as any).mockImplementation(() => 5);
      expect(updateTimestamps([], 4)).toEqual([5]);

      (Date.now as any).mockImplementation(() => 5);
      expect(updateTimestamps([6], 1)).toEqual([6]);
    });
  });

  describe('updateRecords', () => {
    test('works', () => {
      (Date.now as any).mockImplementation(() => 5);
      const records = [
        { key: 'abcd', timestamps: [3, 2] },
        { key: 'xyz', timestamps: [1] },
      ];
      const maxTimestampsPerEntry = 3;
      expect(updateRecords(records, 'abcd', maxTimestampsPerEntry)).toEqual([
        { key: 'abcd', timestamps: [5, 3, 2] },
        { key: 'xyz', timestamps: [1] },
      ]);
    });

    test('removes timestamp', () => {
      (Date.now as any).mockImplementation(() => 5);
      const records = [
        { key: 'abcd', timestamps: [4, 3, 2] },
        { key: 'xyz', timestamps: [1] },
      ];
      const maxTimestampsPerEntry = 3;
      expect(updateRecords(records, 'abcd', maxTimestampsPerEntry)).toEqual([
        { key: 'abcd', timestamps: [5, 4, 3] },
        { key: 'xyz', timestamps: [1] },
      ]);
    });

    test('creates new entry', () => {
      (Date.now as any).mockImplementation(() => 5);
      const records = [
        { key: 'abcd', timestamps: [4, 3, 2] },
        { key: 'xyz', timestamps: [1] },
      ];
      const maxTimestampsPerEntry = 3;
      expect(updateRecords(records, 'bad', maxTimestampsPerEntry)).toEqual([
        { key: 'bad', timestamps: [5] },
        { key: 'abcd', timestamps: [4, 3, 2] },
        { key: 'xyz', timestamps: [1] },
      ]);
    });
  });

  describe('trimUsage', () => {
    test('works', () => {
      (Date.now as any).mockImplementation(() => 5);
      const records = [
        { key: 'abcd', timestamps: [3, 2] },
        { key: 'xyz', timestamps: [1] },
      ];
      const maxEntries = 2;
      expect(trimRecords(records, maxEntries)).toEqual([
        { key: 'abcd', timestamps: [3, 2] },
        { key: 'xyz', timestamps: [1] },
      ]);
    });

    test('sorts correctly', () => {
      (Date.now as any).mockImplementation(() => 5);
      const records = [
        { key: 'xyz', timestamps: [1] },
        { key: 'abcd', timestamps: [3, 2] },
      ];
      const maxEntries = 2;
      expect(trimRecords(records, maxEntries)).toEqual([
        { key: 'abcd', timestamps: [3, 2] },
        { key: 'xyz', timestamps: [1] },
      ]);
    });

    test('sorts correctly 2', () => {
      (Date.now as any).mockImplementation(() => 5);
      const records = [
        { key: 'xyz', timestamps: [1] },
        { key: 'abcd', timestamps: [3, 2] },
        { key: 'bad', timestamps: [4, 2] },
      ];
      const maxEntries = 2;
      expect(trimRecords(records, maxEntries)).toEqual([
        { key: 'bad', timestamps: [4, 2] },
        { key: 'abcd', timestamps: [3, 2] },
      ]);
    });
  });
});

describe('useRecencyMonitor', () => {
  let originalLocalStorage: typeof localStorage;
  beforeEach(() => {
    originalLocalStorage = window.localStorage;
    let store: any = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => {
          return store[key] || null;
        }),
        setItem: jest.fn((key, value) => {
          store[key] = value.toString();
        }),
        clear() {
          store = {};
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    (window as any).localStorage = originalLocalStorage;
  });

  test('works', () => {
    let { result } = renderHook(() =>
      useRecencyMonitor({
        uid: 'test1',
      }),
    );

    expect(result.current).toEqual({
      records: [],
      updateRecord: expect.any(Function),
    });
  });

  test('records records', () => {
    (Date.now as any).mockImplementation(() => 5);

    let { result } = renderHook(() =>
      useRecencyMonitor({
        uid: 'test1',
        maxEntries: 2,
        maxTimestampsPerEntry: 2,
      }),
    );
    expect(4).toBe(4);

    act(() => {
      result.current.updateRecord('abcd');
    });

    expect(result.current.records).toEqual([
      {
        key: 'abcd',
        timestamps: [5],
      },
    ]);

    (Date.now as any).mockImplementation(() => 6);

    act(() => {
      result.current.updateRecord('abcd');
    });

    expect(result.current.records).toEqual([
      {
        key: 'abcd',
        timestamps: [6, 5],
      },
    ]);

    (Date.now as any).mockImplementation(() => 7);

    act(() => {
      result.current.updateRecord('abcd');
    });

    expect(result.current.records).toEqual([
      {
        key: 'abcd',
        timestamps: [7, 6],
      },
    ]);
  });

  test('removes record when needed', () => {
    (Date.now as any).mockImplementation(() => 5);

    let { result } = renderHook(() =>
      useRecencyMonitor({
        uid: 'test1',
        maxEntries: 2,
        maxTimestampsPerEntry: 2,
      }),
    );
    expect(4).toBe(4);

    act(() => {
      result.current.updateRecord('abcd');
    });

    expect(result.current.records).toEqual([
      {
        key: 'abcd',
        timestamps: [5],
      },
    ]);

    (Date.now as any).mockImplementation(() => 6);

    act(() => {
      result.current.updateRecord('xyz');
    });
    (Date.now as any).mockImplementation(() => 7);
    act(() => {
      result.current.updateRecord('pqrs');
    });
    (Date.now as any).mockImplementation(() => 8);
    act(() => {
      result.current.updateRecord('xyz');
    });
    expect(result.current.records).toEqual([
      {
        key: 'xyz',
        timestamps: [8, 6],
      },
      {
        key: 'pqrs',
        timestamps: [7],
      },
    ]);
  });
});
