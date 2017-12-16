import map from 'lodash/map';
import mapValues from 'lodash/mapValues';
import isArray from 'lodash/isArray';

const stableMap = (collection, ...args) => (isArray(collection)
  ? map(collection, ...args)
  : mapValues(collection, ...args)
);

export default stableMap;
