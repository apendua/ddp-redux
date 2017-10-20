/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */
import carefullyMapValues from './carefullyMapValues';

// TODO: Implement more tests.
describe('Test utility - carefullyMapValues', () => {
  it('should remove and map at the same time', () => {
    carefullyMapValues({
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
