/* eslint-env jest */

import configureStore from 'redux-mock-store';
import {
  createMiddleware,
} from './middleware';
import {
  DDPClient,
} from './testCommon';

jest.useFakeTimers();

describe('Test module - currentUser - middleware', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.send = jest.fn();
    testContext.close = jest.fn();
    testContext.onError = jest.fn();
    testContext.ddpClient = new DDPClient();
    testContext.ddpClient.send = testContext.send;
    testContext.ddpClient.close = testContext.close;
    testContext.ddpClient.on('error', testContext.onError);
    testContext.middleware = createMiddleware(testContext.ddpClient);
    testContext.mockStore = configureStore([
      testContext.middleware,
    ]);
  });

  test('should pass through an unknown action', () => {
    const store = testContext.mockStore();
    const action = {
      type: 'unknown',
      payload: {},
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual(expect.arrayContaining([
      action,
    ]));
  });
});
