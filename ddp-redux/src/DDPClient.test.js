/* eslint-env jest */

import configureStore from 'redux-mock-store';
import DDPClient from './DDPClient';

describe('Test DDPClient', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.ddpClient = new DDPClient();
  });

  describe('Given I have a ddp middleware', () => {
    beforeEach(() => {
      testContext.middleware = testContext.ddpClient.middleware();
      testContext.mockStore = configureStore([
        testContext.middleware,
      ]);
    });

    test('should accept function as an action', () => {
      const store = testContext.mockStore();
      store.dispatch((dispatch) => {
        dispatch({
          type: 'test_action',
        });
      });
      expect(store.getActions()).toEqual(expect.arrayContaining([
        { type: 'test_action' },
      ]));
    });
  });

  test('should be ok', () => {
    expect(testContext.ddpClient).toBeTruthy();
  });
});
