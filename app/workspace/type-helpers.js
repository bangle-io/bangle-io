import { uuid } from '@bangle.dev/core/utils/js-utils';

export const INDEXDB_TYPE = 'indexdb';
export const NATIVE_FS_TYPE = 'native';

const createIndexdbUid = () => {
  return INDEXDB_TYPE + '_' + uuid(6);
};
const createNativeUid = () => {
  return NATIVE_FS_TYPE + '_' + uuid(6);
};
export const createUidFromType = (type) => {
  switch (type) {
    case NATIVE_FS_TYPE:
      return createNativeUid();
    case INDEXDB_TYPE:
      return createIndexdbUid();
    default:
      throw new Error('Unknown type ' + type);
  }
};

export const getTypeFromUID = (uid) => {
  if (uid.startsWith(INDEXDB_TYPE + '_')) {
    return INDEXDB_TYPE;
  }
  if (uid.startsWith(NATIVE_FS_TYPE + '_')) {
    return NATIVE_FS_TYPE;
  }
  throw new Error('Unknown type ' + uid);
};

export const isUidNative = (uid) => {
  return uid.startsWith(NATIVE_FS_TYPE + '_');
};

export const isUidIndexdb = (uid) => {
  return uid.startsWith(INDEXDB_TYPE + '_');
};
