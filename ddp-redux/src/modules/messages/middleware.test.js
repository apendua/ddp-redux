/* eslint-env jest */

import configureStore from 'redux-mock-store';
import { createMiddleware } from './middleware';
import {
  DEFAULT_SOCKET_ID,

  DDP_METHOD,
  DDP_CONNECT,
  DDP_RESULT,
  DDP_PONG,
  DDP_SUB,
  DDP_UNSUB,
  DDP_ENQUEUE,

  MSG_METHOD,
  MSG_READY,
  MSG_NOSUB,
  MSG_ADDED,
  MSG_ADDED_BEFORE,
  MSG_REMOVED,
  MSG_CHANGED,
  MSG_UPDATED,
  MSG_RESULT,
  MSG_PING,
  MSG_ERROR,
  MSG_CONNECTED,
  MSG_FAILED,

  MESSAGE_TO_ACTION,
  ACTION_TO_MESSAGE,
  ACTION_TO_PRIORITY,
} from '../../constants';
import { DDPClient } from './testCommon';

const createInitialState = (socketId, socketState) => ({
  ddp: {
    messages: {
      sockets: {
        [socketId]: socketState,
      },
    },
  },
});


describe('Test module - messages - middleware', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.send = jest.fn();
    testContext.onError = jest.fn();
    testContext.ddpClient = new DDPClient();
    testContext.ddpClient.on('error', testContext.onError);
    testContext.ddpClient.send = testContext.send;
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
    MSG_READY,
    MSG_NOSUB,
    MSG_ADDED,
    MSG_ADDED_BEFORE,
    MSG_REMOVED,
    MSG_CHANGED,
    MSG_UPDATED,
    MSG_RESULT,
    MSG_PING,
    MSG_ERROR,
    MSG_CONNECTED,
    MSG_FAILED,
  ].forEach((msg) => {
    test(`should translate message "${msg}"`, () => {
      const store = testContext.mockStore({
        ddp: {
          messages: {
            sockets: {},
          },
        },
      });
      testContext.ddpClient.emit('message', {
        msg,
      }, {
        socketId: 'socket/1',
      });
      expect(store.getActions()).toEqual([{
        type: MESSAGE_TO_ACTION[msg],
        payload: {
          msg,
        },
        meta: {
          socketId: 'socket/1',
        },
      }]);
    });
  });

  [
    DDP_PONG,
    DDP_METHOD,
    DDP_SUB,
    DDP_UNSUB,
    DDP_CONNECT,
  ].forEach((type) => {
    test(`should process action ${type}`, () => {
      const store = testContext.mockStore(createInitialState('1', {
        pending: {},
        queue: [],
      }));
      store.dispatch({
        type,
      });
      const ddpMessage = {
        msg: ACTION_TO_MESSAGE[type],
        ...((type === DDP_SUB || type === DDP_METHOD) && {
          id: '1',
        }),
      };
      expect(store.getActions()).toEqual([{
        type,
        payload: ddpMessage,
        meta: {
          priority: ACTION_TO_PRIORITY[type],
          socketId: DEFAULT_SOCKET_ID,
        },
      }]);
      expect(testContext.send).toBeCalledWith(ddpMessage, {
        priority: ACTION_TO_PRIORITY[type],
        socketId: 'default',
      });
    });
  });

  test('should enqueue action if priority is too low', () => {
    const store = testContext.mockStore(createInitialState('1', {
      pending: {
        1: 20,
        2: 30,
      },
      queue: [],
    }));
    const action = {
      type: DDP_METHOD,
      payload: {
        id: '2',
        msg: MSG_METHOD,
      },
      meta: {
        socketId: '1',
        priority: 25,
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([{
      type: DDP_ENQUEUE,
      payload: action.payload,
      meta: {
        type: action.type,
        ...action.meta,
      },
    }]);
  });

  test('should empty queue up to the computed threshold', () => {
    const store = testContext.mockStore(createInitialState('1', {
      pending: {
        1: 10,
        2: 0,
      },
      queue: [{
        type: DDP_METHOD,
        payload: {
          id: '3',
          msg: MSG_METHOD,
        },
        meta: {
          socketId: '1',
          priority: 10,
        },
      }, {
        type: DDP_METHOD,
        payload: {
          id: '4',
          msg: MSG_METHOD,
        },
        meta: {
          socketId: '1',
          priority: 10,
        },
      }, {
        type: DDP_METHOD,
        payload: {
          id: '5',
          msg: MSG_METHOD,
        },
        meta: {
          priority: 0,
        },
      }],
    }));
    const action = {
      type: DDP_RESULT,
      payload: 4,
      meta: {
        socketId: '1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
      {
        type: DDP_METHOD,
        payload: {
          id: '3',
          msg: MSG_METHOD,
        },
        meta: {
          socketId: '1',
          priority: 10,
        },
      },
      {
        type: DDP_METHOD,
        payload: {
          id: '4',
          msg: MSG_METHOD,
        },
        meta: {
          socketId: '1',
          priority: 10,
        },
      },
    ]);
  });
});
