/* eslint-env jest */

import createValuesMappingSelector from './createValuesMappingSelector';

const constant = x => () => x;
const identity = x => x;

describe('Test utility - createValuesMappingSelector', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.object = {};
    testContext.identity = createValuesMappingSelector(identity, identity);
    testContext.constant = createValuesMappingSelector(identity, constant(testContext.object));
  });

  describe('Given an empty object', () => {
    test('should not be changed by identity mapping', () => {
      const x = {};
      expect(testContext.identity(x)).toBe(x);
    });

    test('should not be changed by constant mapping', () => {
      const x = {};
      expect(testContext.constant(x)).toBe(x);
    });

    test(
      'should return the same result when called with similar argument',
      () => {
        const x = {};
        const y = {};
        expect(testContext.constant(x)).toBe(testContext.constant(y));
      }
    );
  });

  describe('Given a non-empty object', () => {
    test('should not be changed by identity mapping', () => {
      const x = {
        a: {},
        b: {},
      };
      expect(testContext.identity(x)).toBe(x);
    });
    test('should be changed by constant mapping', () => {
      const x = {
        a: {},
        b: {},
      };
      expect(testContext.constant(x)).not.toBe(x);
    });
    test(
      'should return the same result when called with similar argument',
      () => {
        const x = {
          a: {},
          b: {},
        };
        const y = {
          ...x,
        };
        expect(testContext.constant(x)).toBe(testContext.constant(y));
      }
    );
  });
});
