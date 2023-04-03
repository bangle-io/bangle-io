import { key, slice } from '../create';
import { SyncUpdateEffectHandler } from '../effect';
import { Store } from '../store';

const testSlice1 = slice({
  key: key('test-1', [], { num: 4 }),
  actions: {
    increment: (opts: { increment: boolean }) => (state) => {
      return { ...state, num: state.num + (opts.increment ? 1 : 0) };
    },
    decrement: (opts: { decrement: boolean }) => (state) => {
      return { ...state, num: state.num - (opts.decrement ? 1 : 0) };
    },
  },
});

const testSlice2 = slice({
  key: key('test-2', [], { name: 'tame' }),
  actions: {
    prefix: (prefix: string) => (state) => {
      return { ...state, name: prefix + state.name };
    },
    padEnd: (length: number, pad: string) => (state) => {
      return { ...state, name: state.name.padEnd(length, pad) };
    },
    uppercase: () => (state) => {
      return { ...state, name: state.name.toUpperCase() };
    },
  },
});

const testSlice3 = slice({
  key: key('test-3', [], { name: 'tame' }),
  actions: {
    lowercase: () => (state) => {
      return { ...state, name: state.name.toLocaleLowerCase() };
    },
  },
});

test('SyncUpdateEffectHandler works', () => {
  const store = Store.create({
    storeName: 'test-store',
    state: {
      slices: [testSlice1],
    },
  });

  const effect = new SyncUpdateEffectHandler(
    {
      updateSync: () => {},
    },
    store.state,
    testSlice1,
  );

  expect(effect.sliceAndDeps).toEqual([testSlice1]);
});

test('SyncUpdateEffectHandler with deps', () => {
  const mySlice = slice({
    key: key('myslice', [testSlice1, testSlice2], { name: 'tame' }),
    actions: {
      lowercase: () => (state) => {
        return { ...state, name: state.name.toLocaleLowerCase() };
      },
    },
  });
  const store = Store.create({
    storeName: 'test-store',
    state: {
      slices: [testSlice1, testSlice2, mySlice],
    },
  });

  const effect = new SyncUpdateEffectHandler(
    {
      updateSync: () => {},
    },
    store.state,
    mySlice,
  );

  expect(effect.sliceAndDeps).toEqual([testSlice1, testSlice2, mySlice]);
  expect(effect.sliceKey).toMatchInlineSnapshot(`"myslice"`);
});
