/* eslint-env jest */

import configureStore from 'redux-mock-store';
import { createMiddleware } from './middleware';
import { DDPClient } from './testCommon';
import * as thunk from '../thunk';
import {
  DEFAULT_SOCKET_ID,

  DDP_CONNECTED,
  DDP_METHOD,
  DDP_QUERY_CREATE,
  DDP_QUERY_DELETE,
  DDP_QUERY_UPDATE,
  DDP_QUERY_REQUEST,
  DDP_QUERY_RELEASE,
  DDP_QUERY_REFETCH,

  DDP_STATE__READY,
  DDP_STATE__QUEUED,
  DDP_STATE__PENDING,
  DDP_STATE__OBSOLETE,
  DDP_STATE__CANCELED,
} from '../../constants';

jest.useFakeTimers();

describe('Test module - queries - middleware', () => {
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
      thunk.createMiddleware(),
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

  test(
    'should dispatch DDP_QUERY_CREATE and DDP_METHOD if query does not yet exist',
    () => {
      const store = testContext.mockStore({
        ddp: {
          queries: {
          },
        },
      });
      const action = {
        type: DDP_QUERY_REQUEST,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            socketId: 'socket/1',
          },
        },
      };
      const queryId = store.dispatch(action);
      expect(queryId).toBe(DDPClient.defaultUniqueId);
      expect(store.getActions()).toEqual([
        {
          ...action,
          meta: {
            ...action.meta,
            queryId,
          },
        },
        {
          type: DDP_QUERY_CREATE,
          payload: {
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/1',
            },
          },
          meta: {
            queryId: '1',
          },
        },
        {
          type: DDP_METHOD,
          payload: {
            method: 'aQuery',
            params: [1, 2, 3],
          },
          meta: {
            queryId: '1',
            socketId: 'socket/1',
          },
        },
      ]);
    },
  );

  [
    DDP_STATE__CANCELED,
    DDP_STATE__OBSOLETE,
  ].forEach((state) => {
    test(
      `should dispatch DDP_METHOD if query exists, but it is "${state}"`,
      () => {
        const store = testContext.mockStore({
          ddp: {
            queries: {
              1: {
                id: '1',
                name: 'aQuery',
                params: [1, 2, 3],
                properties: {
                  socketId: 'socket/1',
                },
                state,
              },
            },
          },
        });
        const action = {
          type: DDP_QUERY_REQUEST,
          payload: {
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/1',
            },
          },
        };
        const queryId = store.dispatch(action);
        expect(queryId).toBe(DDPClient.defaultUniqueId);
        expect(store.getActions()).toEqual([
          {
            ...action,
            meta: {
              ...action.meta,
              queryId,
            },
          },
          {
            type: DDP_METHOD,
            payload: {
              method: 'aQuery',
              params: [1, 2, 3],
            },
            meta: {
              queryId: '1',
              socketId: 'socket/1',
            },
          },
        ]);
      },
    );
  });

  test(
    'should not dispatch DDP_QUERY_CREATE nor DDP_METHOD if query already exists',
    () => {
      const store = testContext.mockStore({
        ddp: {
          queries: {
            2: {
              id: '2',
              name: 'aQuery',
              params: [1, 2, 3],
              properties: {
                socketId: 'socket/1',
              },
              state: DDP_STATE__READY,
            },
          },
        },
      });
      const action = {
        type: DDP_QUERY_REQUEST,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            socketId: 'socket/1',
          },
        },
      };
      const queryId = store.dispatch(action);
      expect(queryId).toBe('2');
      expect(store.getActions()).toEqual([
        {
          ...action,
          meta: {
            queryId,
          },
        },
      ]);
    },
  );

  test(
    'should add "entities" into the payload on DDP_QUERY_UPDATE',
    () => {
      const store = testContext.mockStore({
        ddp: {
          queries: {
            1: {
              id: '1',
              name: 'aQuery',
              params: [1, 2, 3],
              state: DDP_STATE__PENDING,
              entities: {},
            },
          },
        },
      });
      const action = {
        type: DDP_QUERY_UPDATE,
        payload: {
          result: {
            entities: {
              col1: {
                1: { id: '1' },
              },
            },
          },
        },
        meta: {
          queryId: '1',
        },
      };
      store.dispatch(action);
      expect(store.getActions()).toEqual([
        {
          ...action,
          payload: {
            ...action.payload,
            entities: {
              col1: {
                1: { id: '1' },
              },
            },
            oldEntities: {},
          },
          meta: {
            queryId: '1',
          },
        },
      ]);
    },
  );

  test('should do nothing if relase is called on unknown id', () => {
    const store = testContext.mockStore({
      ddp: {
        queries: {
        },
      },
    });
    const action = {
      type: DDP_QUERY_RELEASE,
      meta: {
        queryId: '1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
    ]);
  });

  test('should dispatch DDP_QUERY_DELETE on query release', () => {
    const store = testContext.mockStore({
      ddp: {
        queries: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            users: 1,
            entities: {},
          },
        },
      },
    });
    const action = {
      type: DDP_QUERY_RELEASE,
      meta: {
        queryId: '1',
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
        type: DDP_QUERY_DELETE,
        payload: {
          entities: {},
        },
        meta: {
          queryId: '1',
        },
      },
    ]);
  });

  test(
    'should not dispatch DDP_QUERY_DELETE on release if it is requested again',
    () => {
      const store = testContext.mockStore({
        ddp: {
          queries: {
            1: {
              id: '1',
              state: DDP_STATE__READY,
              name: 'aQuery',
              params: [1, 2, 3],
              properties: {
                socketId: DEFAULT_SOCKET_ID,
              },
              users: 1,
            },
          },
        },
      });
      const action1 = {
        type: DDP_QUERY_RELEASE,
        meta: {
          queryId: '1',
        },
      };
      const action2 = {
        type: DDP_QUERY_REQUEST,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            socketId: DEFAULT_SOCKET_ID,
          },
        },
        meta: {
          queryId: '1',
        },
      };
      store.dispatch(action1);
      store.dispatch(action2);
      expect(store.getActions()).toEqual([
        action1,
        action2,
      ]);

      jest.advanceTimersByTime(30000);
      expect(store.getActions()).toEqual([
        action1,
        action2,
      ]);
    },
  );

  test(
    'should not dispatch DDP_QUERY_DELETE if there are many users',
    () => {
      const store = testContext.mockStore({
        ddp: {
          queries: {
            1: {
              id: '1',
              state: DDP_STATE__READY,
              name: 'aQuery',
              params: [1, 2, 3],
              users: 2,
            },
          },
        },
      });
      const action = {
        type: DDP_QUERY_RELEASE,
        meta: {
          queryId: '1',
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
    },
  );

  test('should re-fetch queries on re-connect', () => {
    const store = testContext.mockStore({
      ddp: {
        queries: {
          1: {
            id: '1',
            state: DDP_STATE__OBSOLETE,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/1',
            },
            users: 1,
          },
          2: {
            id: '2',
            state: DDP_STATE__QUEUED,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/1',
            },
            users: 1,
          },
          3: {
            id: '3',
            state: DDP_STATE__OBSOLETE,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/2',
            },
            users: 1,
          },
        },
      },
    });
    const action = {
      type: DDP_CONNECTED,
      payload: {},
      meta: {
        socketId: 'socket/1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
      {
        type: DDP_QUERY_REFETCH,
        meta: {
          queryId: '1',
        },
      },
      {
        type: DDP_METHOD,
        payload: {
          method: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          queryId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  test('should dispatch method call on DDP_QUERY_REFETCH', () => {
    const store = testContext.mockStore({
      ddp: {
        queries: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/1',
            },
            users: 1,
          },
        },
      },
    });
    const action = {
      type: DDP_QUERY_REFETCH,
      meta: {
        queryId: '1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
      {
        type: DDP_METHOD,
        payload: {
          method: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          queryId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  test(
    'should not dispatch method call on DDP_QUERY_REFETCH if query has no users',
    () => {
      const store = testContext.mockStore({
        ddp: {
          queries: {
            1: {
              id: '1',
              state: DDP_STATE__READY,
              name: 'aQuery',
              params: [1, 2, 3],
              properties: {
                socketId: 'socket/1',
              },
              users: 0,
            },
          },
        },
      });
      const action = {
        type: DDP_QUERY_REFETCH,
        meta: {
          queryId: '1',
        },
      };
      store.dispatch(action);
      expect(store.getActions()).toEqual([
        action,
      ]);
    },
  );
});
