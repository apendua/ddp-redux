/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */
import decentlyMapValues from './decentlyMapValues';

const constant = x => () => x;
const identity = x => x;

describe('Test utility - decentlyMapValues', () => {
  beforeEach(function () {
    this.object = {};
  });

  it('should remove and map at the same time', function () {
    decentlyMapValues({
      1: 1,
      2: 2,
      3: 3,
      4: 4,
    }, (value, key, remove) => {
      if (value % 2 === 0) {
        return remove(key);
      }
      return value + 1;
    }).should.deep.equal({
      1: 2,
      3: 4,
    });
  });
});
