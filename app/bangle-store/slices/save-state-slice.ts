import { Slice } from '@bangle.io/create-store';
import type { BangleStateConfig } from '@bangle.io/shared-types';
import { pageLifeCycleTransitionedTo } from '@bangle.io/slice-page';
import { asssertNotUndefined } from '@bangle.io/utils';

// monitor the pages life cycle and call the saveState handle to persist things
export function saveStateSlice() {
  return new Slice({
    sideEffect(_, config: BangleStateConfig) {
      asssertNotUndefined(config.saveState, 'config saveState must be defined');

      return {
        update(store, prevState) {
          const didChange = pageLifeCycleTransitionedTo(
            ['passive', 'terminated', 'hidden'],
            prevState,
          )(store.state);

          if (didChange) {
            config.saveState(store);
          }
        },
      };
    },
  });
}
