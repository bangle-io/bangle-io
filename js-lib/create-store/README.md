
This is a javascript state management library, that is inspired by `prosemirror` plugin state management system.

## Terminology

- Actions: Similar to Redux, simple objects containing the state change.

- Operations: Functions that have a signature like `(...options) => (state, dispatch?, store?) => {}`. They generally dispatch an action, read and return a slice state, or both.

- Effects: They run after a state has been updated. Two types:
  - sync: Run after every state update.
  - deferred: Run at a slower cadence determined by the store's scheduler.

- Slice: Similar to redux's reducer, it manages the state transitions, and also hosts the effects that will be run.

- SliceKey: A static variable for getting a slice's state when a store is provided.

- State: The monolithic redux like state of the app.

- Store: The monolith object that contains the current state and also dispatches actions, triggers effects.


## Simple Example

The following is a simple example of a slice where we can increment and decrement a counter.

```js
 const counterSliceKey = new SliceKey<{}>('counter');

const counterSlice = new Slice({
  key: counterSliceKey,
  state: {
    init: () => 0,
    apply: (action, counter) => {
      if (action.name === 'INCREMENT') {
        return counter + 1;
      }
       if (action.name === 'DECREMENT') {
        return counter - 1;
      }
      return counter;
    },
  },
});

const state = AppState.create({ slices: [] });
const store = ApplicationStore.create({
  storeName: 'my-store',
  state,
});

store.dispatch({ name: 'INCREMENT' })
console.log(counterSliceKey.getSliceState(store.state)) // 1

store.dispatch({ name: 'DECREMENT' })
console.log(counterSliceKey.getSliceState(store.state)) // 0
```


## With Effects


### update

This **generally** runs after all slices have applied the action to the states. It is possible that an `update` effect will not be called directly after a state update, if a previous effect (an effect that was defined before the current effect) ends up dispatching an action. You should only use this effect if responding to a state change immediately is important. 

### deferredUpdate

This is similar to `update` but runs at a lower cadence than `update`, the frequency with which this is called can be customized by the `store`'s `scheduler` function. Ideally you should use this for majority of your effects.

### destroy

This is called when the store is destroyed. Use it for any cleanup.

## Effects Example

```js

const counterSlice = new Slice({
  key: counterSliceKey,
  state: {
    init: () => 0,
    apply: (action, counter) => {
      if (action.name === 'INCREMENT') {
        return counter + 1;
      }
       if (action.name === 'DECREMENT') {
        return counter - 1;
      }
      return counter;
    },
  },
  sideEffect() {
    return {
      destroy() {
        console.log('destroyed');
      },
      update(store, prevState, sliceState, prevSliceState) {
        if (sliceState - prevSliceState > 0) {
          console.log('State is Positive')
        }
         if prevSliceState - sliceState > 0) {
          console.log('State is Negative')
        }
      },
      deferredUpdate(store, abortSignal) {
        const sliceState = counterSliceKey.getSliceState(store.state);

        if (sliceState > 10) {
          makeSomeAsyncRequest(sliceState, abortSignal).then(() => {
            if (!abortSignal.aborted) {
              console.log('success')
            } else {
              console.log('effect was aborted')
            }
          })
        }
      }
    }
  }
});
```

### Operations Example

Operations are function that have a specific signature (see example) and dispatch an action or query the state.

```js

function incrementCounter() {
  return (state, dispatch, store)  => {
    dispatch({ name: 'INCREMENT' })
  }
}

incrementCounter()(store.state, store.dispatch, store);
```

## Best practices for async Operations 

When creating an async operation it is vital to make sure to use `store.state` after an async operation to get the latest state. It is a good idea to break down your async operation into smaller preferably sync operations and then orchestrating the calls in one big master async operation.