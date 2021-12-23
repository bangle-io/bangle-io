
This library is inspired from `prosemirror` plugin state management system.

## Terminology

- Actions: Similar to Redux, simple objects containing the state change.

- Operations: Functions that have a signature like `(...options) => (state, dispatch?, store?) => {}`. They generally dispatch an action, read and return a slice state, or both.

- Effects: They run after a state has been updated. To types:
  - sync: Run after every state update.
  - deferred: Run at a slower cadence determined by the store's scheduler.

- Slice: Similar to redux's reducer, it managers the state transitions, and also hosts the effects that will be run.

- SliceKey: A static variable for getting a slice's state when a store is provided.

- State: The monolithic redux like state of the app.

- Store: The monolith object that contains the current state and also dispatches actions, effects.

## Best practices for Operations

When creating an async operation it is vital to make sure to use `store.state` after an async operation to get the latest state. It is a good idea to break down your async operation into smaller preferably sync operations and then orchestrating the calls in one big master async operation.