import shallowEqual from 'shallowequal';
import carefullyMapValues from './carefullyMapValues';

const defaultIsEqual = (a, b) => a === b;

const memoizeValuesMapping = (mapOneValue, isEqual = defaultIsEqual) => {
  let lastInput = null;
  let lastResult = null;
  return (input) => {
    if (!lastResult) {
      lastResult = input;
    }
    const result = carefullyMapValues(input, (value, key) => {
      const lastValue = lastResult && lastResult[key];
      if (lastInput && lastInput[key] === value) {
        return lastValue;
      }
      return mapOneValue(value, key);
    }, isEqual);
    lastInput = input;
    if (!shallowEqual(result, lastResult)) {
      lastResult = result;
    }
    return lastResult;
  };
};

export default memoizeValuesMapping;
