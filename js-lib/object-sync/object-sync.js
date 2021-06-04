export function objectSync(obj, emitChange) {
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
    console.log(value);
    throw new Error('Invalid value type ' + typeof value);
  };

  Object.values(obj).forEach((val) => {
    valueCheck(val);
  });

  let counter = 0;

  let changeListeners = [];

  const updateProp = (target, key, value) => {
    valueCheck(value);
    if (!allowedKeys.has(key)) {
      throw new Error('Invalid key ' + key);
    }

    const existingValue = Reflect.get(target, key);
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
    changeListeners.forEach((fn) => fn(proxy));
  };

  return {
    // a number that can be used to check if the object has updated since last time
    get counter() {
      return counter;
    },
    // callback that updates the current object to match
    // with the one you are syncing with.
    applyForeignChange: ({ type, payload: { key, value } }) => {
      if (type === 'UPDATE') {
        updateProp(obj, key, value);
      } else {
        throw new Error('Unknown type of change');
      }
    },
    proxy,
    register: (fn) => {
      if (changeListeners.includes(fn)) {
        return;
      }
      changeListeners.push(fn);
    },
    deregister: (fn) => {
      changeListeners = changeListeners.filter((f) => f !== fn);
    },
  };
}
