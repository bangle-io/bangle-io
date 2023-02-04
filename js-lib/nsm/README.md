## Features

- Clean abstractions - you control over the state change. No magic. 

## Dependencies

Knowing the dependencies of a slice helps ensure any code is only run when its dependencies are updated. Think of it as React's virtual DOM but without the DOM which is the slowest part of React.

## Selectors
### Accessing other selectors inside a selector


## Syncing across multiple stores

```ts

const mySlice = slice({
  key: 'test-3',
  initState: { name: 'jojo' },
  actions: {
    lowercase: () => (state) => {
      return { ...state, name: state.name.toLocaleLowerCase() };
    },
  },
});

const mainStore =  Store.create({
    storeName: 'main-store',
    state: State.create({
        slices: [
            mySlice
        ]
    })
})

const workerStore = Store.create({
    storeName: 'worker-store',
    state: State.create({
        slices: [
            replica(mySlice, { mainStore: 'main-store'}),
        ]
    })
});

```
