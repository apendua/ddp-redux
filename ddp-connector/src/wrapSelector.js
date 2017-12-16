import {
  createSelectorCreator,
  defaultMemoize,
} from 'reselect';
import { EJSON } from 'ddp-redux';

const identity = x => x;
const constant = x => () => x;

const createSelector = createSelectorCreator(
  defaultMemoize,
  EJSON.equals,
);

/**
 * Create a function that compares the computed value with the previous one
 * and if they're deeply equal, it returns the previous result.
 */
const memoize = x => createSelector(x, identity);

const wrapSelector = (selector) => {
  let compiled;
  // Make sure that the function is only called with the arguments it needs.
  // This is important when the function uses arguments based caching
  // to optimize it's computations.
  const compile = (func) => {
    // if (func.length >= 2) {
    //   return memoize(func);
    // } else if (func.length === 1) {
    //   return memoize(state => func(state));
    // }
    // console.log('no arguments at all', func.toString());
    // return memoize(() => func());
    return memoize(func);
  };
  return (state, ownProps) => {
    if (compiled) {
      return compiled(state, ownProps);
    }
    if (typeof selector !== 'function') {
      compiled = constant(selector);
      return compiled();
    }
    const props = selector(state, ownProps);
    if (typeof props === 'function') {
      compiled = compile(props);
      return compiled(state, ownProps);
    }
    compiled = compile(selector);
    return props;
  };
};

export default wrapSelector;
