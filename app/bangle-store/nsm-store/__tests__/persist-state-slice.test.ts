import { superJson } from '@bangle.io/nsm-3';

import { persistData, retrieveData } from '../persist-state-slice';

const localStorageMock = () => {
  let store: { [key: string]: string } = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
};

test('works', () => {
  const mock = localStorageMock();

  persistData('my-key', mock, (data) => {
    data['hello'] = superJson.serialize({
      test: 'obj',
      map: new Map([['a', 1]]),
    });
  });

  let result = retrieveData('my-key', mock, (data) => {
    const result = data['hello'];

    if (result === undefined) {
      throw new Error('Expected to find hello');
    }

    expect(superJson.deserialize(result)).toEqual({
      test: 'obj',
      map: new Map([['a', 1]]),
    });

    return {
      hello: '',
    };
  });

  expect(result).toMatchInlineSnapshot(`
    {
      "hello": "",
    }
  `);
});
