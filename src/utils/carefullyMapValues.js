import omit from 'lodash/omit';
import mapValues from 'lodash/mapValues';

const defaultIsEqual = (a, b) => a === b;

/**
 * Like lodash/mapValues, but with more caution, e.g. when new value is the
 * the same as the old one, do not create a new object. Also gives ability
 * to remove selected fields.
 * @param {object} object to map
 * @param {function} mapValue
 * @param {function} isEqual
 * @returns {object}
 */
const carefullyMapValues = (object, mapValue, isEqual = defaultIsEqual) => {
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
  if (toRemove.length > 0) {
    return omit(newObject, toRemove);
  }
  if (!modified) {
    return object;
  }
  return newObject;
};

export default carefullyMapValues;
