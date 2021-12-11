export type Listener<S> = (state: S) => void;
export type Dispatch<A> = (action: A) => void;
// createStore exists to provider useReducer
// type of api but at places where react cannot
// exist -- worker, iframe etc.
export function createStore<S, I extends S, A>(
  rootReducer: (state: S, action: A) => S,
  initialArg: I,
  initialize?: (initArg: I) => S,
) {
  let destroyed = false;
  let state = initialize ? initialize(initialArg) : initialArg;

  let listeners: Set<Listener<S>> = new Set();

  const getState = () => state;

  const dispatch: Dispatch<A> = (action: A) => {
    if (destroyed) {
      return;
    }
    state = rootReducer(state, action);
    listeners.forEach((listener) => listener(state));
  };

  const subscribe = (listener: Listener<S>) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const destroy = () => {
    listeners = new Set();
    destroyed = true;
  };

  return { getState, dispatch, subscribe, destroy };
}
