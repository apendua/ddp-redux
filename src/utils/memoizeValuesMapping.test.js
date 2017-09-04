/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */
import memoizeValuesMapping from './memoizeValuesMapping';

const constant = x => () => x;
const identity = x => x;

describe('Test memoizeValuesMapping', () => {
  beforeEach(function () {
    this.object = {};
    this.identity = memoizeValuesMapping(identity);
    this.constant = memoizeValuesMapping(constant(this.object));
  });

  describe('Given an empty object', () => {
    it('should not be changed by identity mapping', function () {
      const x = {};
      this.identity(x).should.equal(x);
    });

    it('should not be changed by constant mapping', function () {
      const x = {};
      this.constant(x).should.equal(x);
    });

    it('should return the same result when called with similar argument', function () {
      const x = {};
      const y = {};
      this.constant(x).should.equal(this.constant(y));
    });
  });

  describe('Given a non-empty object', () => {
    it('should not be changed by identity mapping', function () {
      const x = {
        a: {},
        b: {},
      };
      this.identity(x).should.equal(x);
    });
    it('should be changed by constant mapping', function () {
      const x = {
        a: {},
        b: {},
      };
      this.constant(x).should.not.equal(x);
    });
    it('should return the same result when called with similar argument', function () {
      const x = {
        a: {},
        b: {},
      };
      const y = {
        ...x,
      };
      this.constant(x).should.equal(this.constant(y));
    });
  });
});
