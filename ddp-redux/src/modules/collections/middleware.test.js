/* eslint-env jest */
/* eslint no-invalid-this: "off" */

import configureStore from 'redux-mock-store';
import { createMiddleware } from './middleware';
import {
  DDP_FLUSH,
  DDP_READY,
  DDP_UPDATED,

  DDP_ADDED,
  DDP_CHANGED,
  DDP_REMOVED,
} from '../../constants';
import { DDPClient } from './testCommon';

jest.useFakeTimers();

describe('Test module - collections - middleware', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.send = jest.fn();
    testContext.ddpClient = new DDPClient();
    testContext.ddpClient.socket.send = testContext.send;
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

  [
    DDP_ADDED,
    DDP_CHANGED,
    DDP_REMOVED,
  ].forEach((type) => {
    test(`should schedule dispatching ${DDP_FLUSH} after ${type}`, () => {
      const store = testContext.mockStore({
        ddp: {
          collections: {
            col1: {
              needsUpdate: true,
            },
          },
        },
      });
      const action = {
        type,
        payload: {
        },
        meta: {
          socketId: 'socket/1',
        },
      };
      store.dispatch(action);
      expect(store.getActions()).toEqual([
        action,
      ]);

      jest.advanceTimersByTime(1000);

      expect(store.getActions()).toEqual([
        action,
        {
          type: DDP_FLUSH,
        },
      ]);
    });
  });

  [
    DDP_READY,
    DDP_UPDATED,
  ].forEach((type) => {
    test(`should dispatch ${DDP_FLUSH} right before ${type}`, () => {
      const store = testContext.mockStore({
        ddp: {
          collections: {
            col1: {
              needsUpdate: true,
            },
          },
        },
      });
      const action = {
        type,
        payload: {
        },
      };
      store.dispatch(action);
      expect(store.getActions()).toEqual([
        {
          type: DDP_FLUSH,
        },
        action,
      ]);
    });
  });
});
