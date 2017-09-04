import mapValues from 'lodash.mapvalues';
import shallowEqual from 'shallowequal';

const defaultIsEqual = (a, b) => a === b;

const memoizeValuesMapping = (mapOneValue, isEqual = defaultIsEqual) => {
  let lastInput = null;
  let lastResult = null;
  return (input) => {
    if (!lastResult) {
      lastResult = input;
    }
    if (shallowEqual(input, lastInput)) {
      return lastResult;
    }
    const result = mapValues(input, (value, key) => {
      const lastValue = lastResult && lastResult[key];
      if (lastInput && lastInput[key] === value) {
        return lastValue;
      }
      const newValue = mapOneValue(value);
      if (!isEqual(newValue, lastValue)) {
        return newValue;
      }
      return lastValue;
    });
    lastInput = input;
    if (!shallowEqual(result, lastResult)) {
      lastResult = result;
    }
    return lastResult;
  };
};

export default memoizeValuesMapping;
