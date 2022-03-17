
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
      deferredUpdate(store, prevState, abortSignal) {
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

### Best practices for async Operations 

When creating an async operation it is vital to make sure to use `store.state` after an async operation to get the latest state. It is a good idea to break down your async operation into smaller preferably sync operations, which update the store's state and get orchestrated via an _effect_ instead of an operation. Avoid having operations which have multiple async steps, as it will make the application more complex and harder to reason about.

### Best practices for effects

Effects are tricky, which is why we also refer to them as side-effects.

- When using side-effects, try to use `deferredUpdate` over `update` because it runs asyncronously.

- When in side-effect rely on using the slices state as much as possible and avoid making async tasks within the effect. If there is an async task that needs to happen, create a separate side-effect which runs it and stores it async tasks result in the slice state, so that other effects can use it. Remember it is less bug-prone to deal with syncronous data than async data.

- If you are using certain variables in your side-effect , make sure you have code that ignores them if they show up in next call.

- Be thoughtful of things that can throw error in your effects as this can lead to stack overflow due to an error handler clearing the error and your effect throwing it back. One good rule is to read and save data in the state of slice and early exiting if the required data for the effect is not there.


## Appending an action after actions

Allows slice to append an action after the provided actions and produced a new state. If any other slice appends an action, this is called again with the new state and new actions - but only the new actions and not the ones it has already seen or returned before. This works similar to PM's [appendAction](https://prosemirror.net/docs/ref/#state.PluginSpec.appendTransaction).

```js
const key1 = new SliceKey<string>('one');
const slice1 = new Slice({
  key: key1,
  state: {
    init: () => '👻',
    apply: (action, value) => value + action.value.emoji,
  },
  appendAction(actions, state) {
    if (actions.some((a) => a.name.startsWith('interesting-action'))) {
      return {
        name: 'appended-action',
        value: { emoji: '💩' },
      };
    }
    return undefined;
  },
});

const state = AppState.create({ slices: [slice1] });
const newState = state.applyAction({
  name: 'interesting-action',
  value: {
    emoji: '🐔',
  },
});

console.log(key1.getSliceState(newState)) // "👻💩🐔"
```