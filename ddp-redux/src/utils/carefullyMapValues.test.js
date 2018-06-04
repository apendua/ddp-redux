/* eslint-env jest */
import carefullyMapValues from './carefullyMapValues';

// TODO: Implement more tests.
describe('Test utility - carefullyMapValues', () => {
  test('should remove and map at the same time', () => {
    expect(carefullyMapValues({
      1: 1,
      2: 2,
      3: 3,
      4: 4,
    }, (value, key, remove) => {
      if (value % 2 === 0) {
        return remove(key);
      }
      return value + 1;
    })).toEqual({
      1: 2,
      3: 4,
    });
  });
});
