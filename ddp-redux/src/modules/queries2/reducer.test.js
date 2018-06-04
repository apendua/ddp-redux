/* eslint-env jest */
/* eslint no-invalid-this: "off" */

import {
  createReducer,
} from './reducer';
import {
  DDPClient,
} from './testCommon';

describe('Test module - queries2 - reducer', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.reducer = createReducer(DDPClient);
  });

  test('should initialize state', () => {
    expect(testContext.reducer(undefined, {})).toEqual({});
  });
});
