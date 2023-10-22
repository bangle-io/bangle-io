import { Operation } from '../operation';
import { Store } from '../store';
import { Transaction } from '../transaction';

describe('transaction dispatch types', () => {
  test('typing works', () => {
    () => {
      let ref: Transaction<'bangle/slice-refresh-workspace'> = {} as any;
      let store: Store<'bangle/slice-refresh-workspace'> = {} as any;

      store.dispatch(ref);
    };

    () => {
      let ref: Operation<'bangle/slice-refresh-workspace'> = {} as any;
      let store: Store<'slice-b'> = {} as any;

      store.dispatch(ref);
    };
  });
});
