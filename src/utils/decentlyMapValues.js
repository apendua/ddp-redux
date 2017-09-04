import mapValues from 'lodash.mapvalues';

const defaultIsEqual = (a, b) => a === b;

const decentlyMapValues = (object, mapValue, isEqual = defaultIsEqual) => {
  let modified = false;
  const newObject = mapValues(object, (v, k) => {
    const newValue = mapValue(v, k);
    if (isEqual(newValue, v)) {
      return v;
    }
    modified = true;
    return newValue;
  });
  if (!modified) {
    return object;
  }
  return newObject;
};

export default decentlyMapValues;
