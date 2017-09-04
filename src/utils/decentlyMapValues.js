import omit from 'lodash.omit';
import mapValues from 'lodash.mapvalues';

const defaultIsEqual = (a, b) => a === b;

const decentlyMapValues = (object, mapValue, isEqual = defaultIsEqual) => {
  let modified = false;

  const toRemove = [];
  const remove = k => toRemove.push(k);

  const newObject = mapValues(object, (v, k) => {
    const newValue = mapValue(v, k, remove);
    if (isEqual(newValue, v)) {
      return v;
    }
    modified = true;
    return newValue;
  });
  if (remove.length > 0) {
    return omit(object, toRemove);
  }
  if (!modified) {
    return object;
  }
  return newObject;
};

export default decentlyMapValues;
