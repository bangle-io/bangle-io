function generateUid(len = 10) {
  return Math.random().toString(36).substring(2, 15).slice(0, len);
}

let counter = 0;
// add a unique string to prevent clashes in case multiple objectUid instances exist
// this can happen for example due to duplicate npm packages due to version or dependency mismatch
const unique = generateUid(4);

class ObjectUID extends WeakMap {
  get(obj: any): string {
    let uid = super.get(obj);

    if (uid) {
      return uid;
    }
    uid = (counter++).toString() + '-' + unique;
    this.set(obj, uid);

    return uid;
  }
}

const _objectUid = new ObjectUID();

export function objectUid<T>(obj: T): string {
  return _objectUid.get(obj);
}
