/* eslint-env jest */

import configureStore from 'redux-mock-store';
import {
  createMiddleware,
} from './middleware';
import {
  DEFAULT_SOCKET_ID,

  DDP_CONNECTION_STATE__DISCONNECTED,
  DDP_CONNECTION_STATE__CONNECTING,
  DDP_CONNECTION_STATE__CONNECTED,

  DDP_ERROR,
  DDP_FAILED,
  DDP_CONNECT,
  DDP_PING,
  DDP_PONG,
  DDP_DISCONNECTED,
  DDP_OPEN,
  DDP_CLOSE,
} from '../../constants';
// import DDPError from '../../DDPError';
import {
  DDPClient,
} from './testCommon';

const createInitialState = (socketId, socketState) => ({
  ddp: {
    connection: {
      sockets: {
        [socketId]: socketState,
      },
    },
  },
});

jest.useFakeTimers();

describe('Test module - connection - middleware', () => {
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

  test('should emit DDPError if message was invalid', () => {
    const store = testContext.mockStore(createInitialState('1', { state: DDP_CONNECTION_STATE__CONNECTED }));
    const ddpMessage = {
      msg: 'error',
      reason: 'Bad message',
    };
    store.dispatch({
      type: DDP_ERROR,
      payload: ddpMessage,
    });
    expect(store.getActions()).toEqual([{
      type: DDP_ERROR,
      payload: ddpMessage,
    }]);
    expect(testContext.onError).toBeCalled();
    // NOTE: Comparing errors does not work because error stacks will be different
    // expect({
    //   ...testContext.onError.firstCall.args[0],
    // }).toEqual({
    //   ...new DDPError(DDPError.ERROR_BAD_MESSAGE, 'Bad message'),
    // });
  });

  test('should close connection if connect failed', () => {
    const store = testContext.mockStore(createInitialState('1', { state: DDP_CONNECTION_STATE__CONNECTING }));
    const ddpMessage = {
      msg: 'failed',
      version: '2.0', // version of protocol which we are not supporting
    };
    store.dispatch({
      type: DDP_FAILED,
      payload: ddpMessage,
    });
    expect(store.getActions()).toEqual([{
      type: DDP_FAILED,
      payload: ddpMessage,
    }]);
    expect(testContext.close).toBeCalled();
  });

  test('should dispatch CLOSE action', () => {
    const store = testContext.mockStore(createInitialState('1', { state: DDP_CONNECTION_STATE__CONNECTED }));
    testContext.ddpClient.emit('close', {
      socketId: '1',
    });
    expect(store.getActions()).toEqual([{
      type: DDP_DISCONNECTED,
      meta: {
        socketId: '1',
      },
    }]);
  });

  test('should dispatch PONG on ddp ping', () => {
    const store = testContext.mockStore(createInitialState('1', { state: DDP_CONNECTION_STATE__CONNECTED }));
    const ping = { msg: 'ping', id: '1234' };
    const pong = { id: '1234' };

    store.dispatch({
      type: DDP_PING,
      payload: ping,
      meta: {
        socketId: '1',
      },
    });
    expect(store.getActions()).toEqual([{
      type: DDP_PING,
      payload: ping,
      meta: {
        socketId: '1',
      },
    }, {
      type: DDP_PONG,
      payload: pong,
      meta: {
        socketId: '1',
      },
    }]);
  });

  test('should dispatch CONNECT action when socket emits "open"', () => {
    const store = testContext.mockStore(createInitialState('1', { state: DDP_CONNECTION_STATE__DISCONNECTED }));
    const ddpMessage = {
      support: ['1'],
      version: '1',
    };
    testContext.ddpClient.emit('open', {
      socketId: '1',
    });
    expect(store.getActions()).toEqual([{
      type: DDP_CONNECT,
      payload: ddpMessage,
      meta: {
        socketId: '1',
      },
    }]);
  });

  test('should open a new connection when DDP_OPEN is dispatched', () => {
    const store = testContext.mockStore({
      ddp: {
        connection: {
          sockets: {},
        },
      },
    });
    const action = {
      type: DDP_OPEN,
      payload: {
        endpoint: 'http://example.com',
      },
    };
    const socketId = store.dispatch(action);
    expect(socketId).toBe(DEFAULT_SOCKET_ID);
    expect(store.getActions()).toEqual([
      {
        ...action,
        meta: {
          socketId,
        },
      },
    ]);
    expect(testContext.ddpClient.sockets[DEFAULT_SOCKET_ID]).toEqual({
      endpoint: 'http://example.com',
    });
  });

  test(
    'should not open a new connection if theres already one with required parameters',
    () => {
      const store = testContext.mockStore({
        ddp: {
          connection: {
            sockets: {
              'socket/1': {
                id: 'socket/1',
                endpoint: 'http://example.com',
              },
            },
          },
        },
      });
      const action = {
        type: DDP_OPEN,
        payload: {
          endpoint: 'http://example.com',
        },
      };
      const socketId = store.dispatch(action);
      expect(socketId).toBe('socket/1');
      expect(store.getActions()).toEqual([
        {
          ...action,
          meta: {
            socketId,
          },
        },
      ]);
      expect(testContext.ddpClient.sockets).toEqual({});
    }
  );

  test('should close connection if there is only one user', () => {
    const store = testContext.mockStore({
      ddp: {
        connection: {
          sockets: {
            'socket/1': {
              id: 'socket/1',
              users: 1,
              endpoint: 'http://example.com',
            },
          },
        },
      },
    });
    const action = {
      type: DDP_CLOSE,
      meta: {
        socketId: 'socket/1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
    ]);
    jest.advanceTimersByTime(30000);
    expect(testContext.close).toBeCalled();
  });

  test('should not close connection if there are many users', () => {
    const store = testContext.mockStore({
      ddp: {
        connection: {
          sockets: {
            'socket/1': {
              id: 'socket/1',
              users: 2,
              endpoint: 'http://example.com',
            },
          },
        },
      },
    });
    const action = {
      type: DDP_CLOSE,
      meta: {
        socketId: 'socket/1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
    ]);
    jest.advanceTimersByTime(30000);
    expect(testContext.close).not.toBeCalled();
  });
});
