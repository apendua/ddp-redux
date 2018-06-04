/* eslint-env jest */

import configureStore from 'redux-mock-store';
import { createMiddleware } from './middleware';
import { createMiddleware as createResourcesMiddleware } from '../resources';
import { DDPClient } from './testCommon';
import * as thunk from '../thunk';
import {
  DEFAULT_SOCKET_ID,

  DDP_CONNECTED,
  DDP_METHOD,
  DDP_RESOURCE_CREATE,
  DDP_RESOURCE_DELETE,
  DDP_RESOURCE_UPDATE,
  DDP_RESOURCE_REQUEST,
  DDP_RESOURCE_RELEASE,
  DDP_RESOURCE_FETCH,
  DDP_RESOURCE_REFETCH,
  DDP_RESOURCE_DEPRECATE,

  DDP_STATE__READY,
  DDP_STATE__QUEUED,
  DDP_STATE__PENDING,
  DDP_STATE__OBSOLETE,
  DDP_STATE__CANCELED,
} from '../../constants';

jest.useFakeTimers();

describe('Test module - queries2 - middleware', () => {
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
    testContext.resourcesMiddleware = createResourcesMiddleware(testContext.ddpClient);
    testContext.methodsMiddleware = () => next => (action) => {
      if (typeof action !== 'object') {
        return next(action);
      }
      if (action.type === DDP_METHOD) {
        next(action);
        return Promise.resolve();
      }
      return next(action);
    };
    testContext.mockStore = configureStore([
      thunk.createMiddleware(),
      testContext.resourcesMiddleware,
      testContext.middleware,
      testContext.methodsMiddleware,
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

  test('should return a newly create resourceId', () => {
    const store = testContext.mockStore({
      ddp: {
        resources: {
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_REQUEST,
      payload: {
        name: 'aQuery',
        params: [1, 2, 3],
        properties: {
          type: 'query',
          socketId: 'socket/1',
        },
      },
    };
    expect(store.dispatch(action)).toBe(DDPClient.defaultUniqueId);
  });

  test(
    'should dispatch DDP_RESOURCE_CREATE and DDP_METHOD if query does not yet exist',
    () => {
      const store = testContext.mockStore({
        ddp: {
          resources: {
          },
        },
      });
      const action = {
        type: DDP_RESOURCE_REQUEST,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
            socketId: 'socket/1',
          },
        },
      };
      const resourceId = store.dispatch(action);
      expect(store.getActions()).toEqual([
        {
          type: DDP_RESOURCE_CREATE,
          payload: {
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
              socketId: 'socket/1',
            },
          },
          meta: {
            resourceId: '1',
          },
        },
        {
          ...action,
          meta: {
            ...action.meta,
            resourceId,
          },
        },
        {
          type: DDP_RESOURCE_FETCH,
          payload: {
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
              socketId: 'socket/1',
            },
          },
          meta: {
            resourceId: '1',
          },
        },
        {
          type: DDP_METHOD,
          payload: {
            method: 'aQuery',
            params: [1, 2, 3],
          },
          meta: {
            resourceId: '1',
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
            resources: {
              1: {
                id: '1',
                name: 'aQuery',
                params: [1, 2, 3],
                properties: {
                  type: 'query',
                  socketId: 'socket/1',
                },
                state,
              },
            },
          },
        });
        const action = {
          type: DDP_RESOURCE_REQUEST,
          payload: {
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
              socketId: 'socket/1',
            },
          },
        };
        const resourceId = store.dispatch(action);
        expect(store.getActions()).toEqual([
          {
            ...action,
            meta: {
              ...action.meta,
              resourceId,
            },
          },
          {
            type: DDP_RESOURCE_FETCH,
            payload: {
              name: 'aQuery',
              params: [1, 2, 3],
              properties: {
                type: 'query',
                socketId: 'socket/1',
              },
            },
            meta: {
              resourceId: '1',
            },
          },
          {
            type: DDP_METHOD,
            payload: {
              method: 'aQuery',
              params: [1, 2, 3],
            },
            meta: {
              resourceId: '1',
              socketId: 'socket/1',
            },
          },
        ]);
      },
    );
  });

  test(
    'should not dispatch DDP_RESOURCE_CREATE nor DDP_METHOD if query already exists',
    () => {
      const store = testContext.mockStore({
        ddp: {
          resources: {
            2: {
              id: '2',
              name: 'aQuery',
              params: [1, 2, 3],
              properties: {
                type: 'query',
                socketId: 'socket/1',
              },
              state: DDP_STATE__READY,
            },
          },
        },
      });
      const action = {
        type: DDP_RESOURCE_REQUEST,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
            socketId: 'socket/1',
          },
        },
      };
      const resourceId = store.dispatch(action);
      expect(resourceId).toBe('2');
      expect(store.getActions()).toEqual([
        {
          ...action,
          meta: {
            resourceId,
          },
        },
      ]);
    },
  );

  test(
    'should add "entities" into the payload on DDP_RESOURCE_UPDATE',
    () => {
      const store = testContext.mockStore({
        ddp: {
          resources: {
            1: {
              id: '1',
              name: 'aQuery',
              params: [1, 2, 3],
              properties: {
                type: 'query',
              },
              state: DDP_STATE__PENDING,
              entities: {},
            },
          },
        },
      });
      const action = {
        type: DDP_RESOURCE_UPDATE,
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
          resourceId: '1',
        },
      };
      store.dispatch(action);
      expect(store.getActions()).toEqual([
        {
          ...action,
          payload: {
            ...action.payload,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
            },
            entities: {
              col1: {
                1: { id: '1' },
              },
            },
            oldEntities: {},
          },
          meta: {
            resourceId: '1',
          },
        },
      ]);
    },
  );

  test('should do nothing if relase is called on unknown id', () => {
    const store = testContext.mockStore({
      ddp: {
        resources: {
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_RELEASE,
      meta: {
        resourceId: '1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
    ]);
  });

  test('should dispatch DDP_RESOURCE_DELETE on query release', () => {
    const store = testContext.mockStore({
      ddp: {
        resources: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
            },
            users: 1,
            entities: {},
          },
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_RELEASE,
      meta: {
        resourceId: '1',
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
        type: DDP_RESOURCE_DELETE,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
          },
          entities: {},
        },
        meta: {
          resourceId: '1',
        },
      },
    ]);
  });

  test(
    'should not dispatch DDP_RESOURCE_DELETE on release if it is requested again',
    () => {
      const store = testContext.mockStore({
        ddp: {
          resources: {
            1: {
              id: '1',
              state: DDP_STATE__READY,
              name: 'aQuery',
              params: [1, 2, 3],
              properties: {
                type: 'query',
                socketId: DEFAULT_SOCKET_ID,
              },
              users: 1,
            },
          },
        },
      });
      const action1 = {
        type: DDP_RESOURCE_RELEASE,
        meta: {
          resourceId: '1',
        },
      };
      const action2 = {
        type: DDP_RESOURCE_REQUEST,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
            socketId: DEFAULT_SOCKET_ID,
          },
        },
        meta: {
          resourceId: '1',
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
    'should not dispatch DDP_RESOURCE_DELETE if there are many users',
    () => {
      const store = testContext.mockStore({
        ddp: {
          resources: {
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
        type: DDP_RESOURCE_RELEASE,
        meta: {
          resourceId: '1',
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

  test('should re-fetch resources on re-connect', () => {
    const store = testContext.mockStore({
      ddp: {
        resources: {
          1: {
            id: '1',
            state: DDP_STATE__OBSOLETE,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
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
              type: 'query',
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
              type: 'query',
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
        type: DDP_RESOURCE_REFETCH,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
            socketId: 'socket/1',
          },
        },
        meta: {
          resourceId: '1',
        },
      },
      {
        type: DDP_METHOD,
        payload: {
          method: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          resourceId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  test('should dispatch method call on DDP_RESOURCE_REFETCH', () => {
    const store = testContext.mockStore({
      ddp: {
        resources: {
          1: {
            id: '1',
            state: DDP_STATE__READY,
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              type: 'query',
              socketId: 'socket/1',
            },
            users: 1,
          },
        },
      },
    });
    const action = {
      type: DDP_RESOURCE_REFETCH,
      meta: {
        resourceId: '1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      {
        ...action,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            type: 'query',
            socketId: 'socket/1',
          },
        },
      },
      {
        type: DDP_METHOD,
        payload: {
          method: 'aQuery',
          params: [1, 2, 3],
        },
        meta: {
          resourceId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  test(
    'should not dispatch method call on DDP_RESOURCE_DEPRECATE if query has no users',
    () => {
      const store = testContext.mockStore({
        ddp: {
          resources: {
            1: {
              id: '1',
              state: DDP_STATE__READY,
              name: 'aQuery',
              params: [1, 2, 3],
              properties: {
                type: 'query',
                socketId: 'socket/1',
              },
              users: 0,
            },
          },
        },
      });
      const action = {
        type: DDP_RESOURCE_DEPRECATE,
        meta: {
          resourceId: '1',
        },
      };
      store.dispatch(action);
      expect(store.getActions()).toEqual([
        action,
      ]);
    },
  );
});
