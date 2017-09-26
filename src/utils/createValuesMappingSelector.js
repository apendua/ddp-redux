import {
  defaultMemoize,
} from 'reselect';
import memoizeValuesMapping from './memoizeValuesMapping';

const defaultIsEqual = (a, b) => a === b;

const createValuesMappingSelector = (selectObject, mapOneValue, isEqual = defaultIsEqual) => {
  let recomputations = 0;
  const memoizedMapValues = memoizeValuesMapping((...args) => {
    recomputations += 1;
    return mapOneValue(...args);
  }, isEqual);
  const selector = defaultMemoize((...args) => memoizedMapValues(selectObject(...args)));
  selector.recomputations = () => recomputations;
  selector.resetRecomputations = () => {
    recomputations = 0;
  };
  return selector;
};

export default createValuesMappingSelector;
