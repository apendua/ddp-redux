/* eslint-env jest */

import configureStore from 'redux-mock-store';
import {
  createMiddleware,
} from './middleware';
import {
  DEFAULT_SOCKET_ID,

  DDP_SUBSCRIPTION_STATE__READY,

  DDP_SUBSCRIBE,
  DDP_UNSUBSCRIBE,

  DDP_SUB,
  DDP_UNSUB,
  DDP_CONNECT,
  DDP_ENQUEUE,
} from '../../constants';
import {
  DDPClient,
} from './testCommon';

jest.useFakeTimers();

describe('Test module - subscriptions - middleware', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.send = jest.fn();
    testContext.ddpClient = new DDPClient();
    testContext.ddpClient.socket.send = testContext.send;
    testContext.ddpClient.nextUniqueId = () => '1';
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

  test('should dispatch SUB if not yet subscribed', () => {
    const store = testContext.mockStore({
      ddp: {
        subscriptions: {
        },
      },
    });
    const action = {
      type: DDP_SUBSCRIBE,
      payload: {
        name: 'aSubscription',
        params: [1, 2, 3],
      },
      meta: {
        socketId: 'socket/1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      {
        type: DDP_SUB,
        payload: {
          id: '1',
          name: 'aSubscription',
          params: [1, 2, 3],
        },
        meta: {
          subId: '1',
          socketId: 'socket/1',
        },
      },
      {
        ...action,
        payload: {
          ...action.payload,
          id: '1',
        },
        meta: {
          subId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  test('should attach subId to metadata on DDP_SUB', () => {
    const store = testContext.mockStore({
      ddp: {
        subscriptions: {
        },
      },
    });
    store.dispatch({
      type: DDP_SUB,
      payload: {
        id: '1',
      },
    });
    expect(store.getActions()).toEqual([
      {
        type: DDP_SUB,
        payload: {
          id: '1',
        },
        meta: {
          subId: '1',
        },
      },
    ]);
  });

  test('should attach subId to metadata on DDP_ENQUEUE', () => {
    const store = testContext.mockStore({
      ddp: {
        subscriptions: {
        },
      },
    });
    store.dispatch({
      type: DDP_ENQUEUE,
      payload: {
        id: '1',
      },
      meta: {
        type: DDP_SUB,
      },
    });
    expect(store.getActions()).toEqual([
      {
        type: DDP_ENQUEUE,
        payload: {
          id: '1',
        },
        meta: {
          type: DDP_SUB,
          subId: '1',
        },
      },
    ]);
  });

  test('should not dispatch SUB if already subscribed', () => {
    const store = testContext.mockStore({
      ddp: {
        subscriptions: {
          1: {
            id: '1',
            state: DDP_SUBSCRIPTION_STATE__READY,
            name: 'aSubscription',
            params: [1, 2, 3],
            users: 1,
            socketId: DEFAULT_SOCKET_ID,
          },
        },
      },
    });
    const action = {
      type: DDP_SUBSCRIBE,
      payload: {
        name: 'aSubscription',
        params: [1, 2, 3],
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      {
        ...action,
        payload: {
          ...action.payload,
          id: '1',
        },
        meta: {
          subId: '1',
          socketId: DEFAULT_SOCKET_ID,
        },
      },
    ]);
  });

  test('should do nothing if unsubscribe on unknown id', () => {
    const store = testContext.mockStore({
      ddp: {
        subscriptions: {
        },
      },
    });
    const action = {
      type: DDP_UNSUBSCRIBE,
      meta: {
        subId: '1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
    ]);
  });

  test('should dispatch UNSUB on unsubscribe', () => {
    const store = testContext.mockStore({
      ddp: {
        subscriptions: {
          1: {
            id: '1',
            state: DDP_SUBSCRIPTION_STATE__READY,
            name: 'aSubscription',
            params: [1, 2, 3],
            users: 1,
          },
        },
      },
    });
    const action = {
      type: DDP_UNSUBSCRIBE,
      meta: {
        subId: '1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
    ]);

    jest.advanceTimersByTime(30000);
    expect(store.getActions()).toEqual([
      action,
      {
        type: DDP_UNSUB,
        payload: {
          id: '1',
        },
        meta: {
          subId: '1',
        },
      },
    ]);
  });

  test(
    'should not dispatch UNSUB on unsubscribe then subscribe again',
    () => {
      const store = testContext.mockStore({
        ddp: {
          subscriptions: {
            1: {
              id: '1',
              state: DDP_SUBSCRIPTION_STATE__READY,
              name: 'aSubscription',
              params: [1, 2, 3],
              users: 1,
              socketId: DEFAULT_SOCKET_ID,
            },
          },
        },
      });
      const action1 = {
        type: DDP_UNSUBSCRIBE,
        meta: {
          subId: '1',
        },
      };
      const action2 = {
        type: DDP_SUBSCRIBE,
        payload: {
          id: '1',
          name: 'aSubscription',
          params: [1, 2, 3],
        },
        meta: {
          socketId: DEFAULT_SOCKET_ID,
        },
      };
      store.dispatch(action1);
      store.dispatch(action2);
      expect(store.getActions()).toEqual([
        action1,
        {
          ...action2,
          meta: {
            ...action2.meta,
            subId: '1',
          },
        },
      ]);

      jest.advanceTimersByTime(30000);
      expect(store.getActions()).toEqual([
        action1,
        {
          ...action2,
          meta: {
            ...action2.meta,
            subId: '1',
          },
        },
      ]);
    }
  );

  test('should not dispatch UNSUB if there are many users', () => {
    const store = testContext.mockStore({
      ddp: {
        subscriptions: {
          1: {
            id: '1',
            state: DDP_SUBSCRIPTION_STATE__READY,
            name: 'aSubscription',
            params: [1, 2, 3],
            users: 2,
          },
        },
      },
    });
    const action = {
      type: DDP_UNSUBSCRIBE,
      meta: {
        subId: '1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
    ]);

    jest.advanceTimersByTime(30000);
    expect(store.getActions()).toEqual([
      action,
    ]);
  });

  test('should re-subscribe on re-connect', () => {
    const store = testContext.mockStore({
      ddp: {
        subscriptions: {
          1: {
            id: '1',
            state: DDP_SUBSCRIPTION_STATE__READY,
            name: 'aSubscription',
            params: [1, 2, 3],
            users: 1,
            socketId: 'socket/1',
          },
          2: {
            id: '1',
            state: DDP_SUBSCRIPTION_STATE__READY,
            name: 'aSubscription',
            params: [1, 2, 3],
            users: 1,
            socketId: 'socket/2',
          },
        },
      },
    });
    const action = {
      type: DDP_CONNECT,
      payload: {},
      meta: {
        socketId: 'socket/1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
      {
        type: DDP_SUB,
        payload: {
          id: '1',
          name: 'aSubscription',
          params: [1, 2, 3],
        },
        meta: {
          subId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });
});
