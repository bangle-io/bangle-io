export type ObjectSyncEventType<T> = {
  type: 'UPDATE';
  payload: {
    key: string | Symbol;
    value: T;
  };
};

export type ObjectSyncCallback<T> = (param: {
  counter: number;
  appStateValue: { [key: string]: T };
}) => void;

export function objectSync<T>(
  obj: { [key: string]: T },
  { emitChange = (p: ObjectSyncEventType<T>) => {} } = {},
) {
  const allowedKeys = new Set(Object.keys(obj));

  obj = Object.assign({}, obj);
  const valueCheck = (value) => {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value == null
    ) {
      return true;
    }
    throw new Error('Invalid value type ' + typeof value);
  };

  Object.values(obj).forEach((val) => {
    valueCheck(val);
  });

  let counter = 0;

  let changeListeners: Array<ObjectSyncCallback<T>> = [];

  const updateProp = (target, key: string | Symbol, value: T) => {
    if (typeof key !== 'string') {
      throw new Error('Key much be string type');
    }

    valueCheck(value);

    if (!allowedKeys.has(key)) {
      throw new Error('Invalid key ' + key);
    }

    const existingValue: T = Reflect.get(target, key);
    if (existingValue === value) {
      return true;
    }
    counter++;
    Reflect.set(target, key, value);
    notifyListeners();
    return true;
  };

  const proxy = new Proxy(obj, {
    set(target, propKey, value, receiver) {
      updateProp(target, propKey, value);
      emitChange({
        type: 'UPDATE',
        payload: {
          key: propKey,
          value: Reflect.get(target, propKey),
        },
      });
      return true;
    },
    deleteProperty() {
      throw new Error('Not allowed');
    },
  });

  let notifyListeners = () => {
    changeListeners.forEach((fn: ObjectSyncCallback<T>) =>
      fn({ counter, appStateValue: proxy }),
    );
  };

  return {
    // a number that can be used to check if the object has updated since last time
    get counter() {
      return counter;
    },
    // callback that updates the current object to match
    // with the one you are syncing with.
    applyForeignChange: ({
      type,
      payload: { key, value },
    }: ObjectSyncEventType<T>) => {
      if (type === 'UPDATE') {
        updateProp(obj, key, value);
      } else {
        throw new Error('Unknown type of change');
      }
    },
    appStateValue: proxy,
    registerListener: (fn: ObjectSyncCallback<T>) => {
      if (changeListeners.includes(fn)) {
        return;
      }
      changeListeners.push(fn);
    },
    deregisterListener: (fn: ObjectSyncCallback<T>) => {
      changeListeners = changeListeners.filter((f) => f !== fn);
    },
  };
}
