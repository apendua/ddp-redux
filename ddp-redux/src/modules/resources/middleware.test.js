/* eslint-env jest */

import configureStore from 'redux-mock-store';
import {
  createMiddleware,
} from './middleware';
import * as thunk from '../thunk';
import {
  DEFAULT_SOCKET_ID,

  DDP_CONNECTED,
  DDP_RESOURCE_CREATE,
  DDP_RESOURCE_DELETE,
  DDP_RESOURCE_REQUEST,
  DDP_RESOURCE_RELEASE,
  DDP_RESOURCE_DEPRECATE,
  DDP_RESOURCE_REFETCH,
  DDP_RESOURCE_FETCH,

  DDP_STATE__READY,
  DDP_STATE__QUEUED,
  DDP_STATE__OBSOLETE,
  DDP_STATE__CANCELED,
} from '../../constants';

const constant = x => () => x;
const UNIQUE_ID = '1';

jest.useFakeTimers();

describe('Test module - resources - middleware', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.middleware = createMiddleware({
      nextUniqueId: constant(UNIQUE_ID),
      getCleanupTimeout: constant(1000),
    });
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
    'should dispatch DDP_RESOURCE_CREATE and "fetch" if resource does not yet exist',
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
            socketId: 'socket/1',
          },
        },
      };
      const resourceId = store.dispatch(action);
      expect(resourceId).toBe(UNIQUE_ID);
      expect(store.getActions()).toEqual([
        {
          type: DDP_RESOURCE_CREATE,
          payload: {
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
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
              socketId: 'socket/1',
            },
          },
          meta: {
            resourceId: '1',
          },
        },
      ]);
    }
  );

  [
    DDP_STATE__CANCELED,
    DDP_STATE__OBSOLETE,
  ].forEach((state) => {
    test(
      `should dispatch DDP_RESOURCE_FETCH if resource exists but it is "${state}"`,
      () => {
        const store = testContext.mockStore({
          ddp: {
            resources: {
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
          type: DDP_RESOURCE_REQUEST,
          payload: {
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/1',
            },
          },
        };
        const resourceId = store.dispatch(action);
        expect(resourceId).toBe(UNIQUE_ID);
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
                socketId: 'socket/1',
              },
            },
            meta: {
              resourceId: '1',
            },
          },
        ]);
      }
    );
  });

  test(
    'should not dispatch DDP_RESOURCE_CREATE nor DDP_RESOURCE_FETCH if resource already exists',
    () => {
      const store = testContext.mockStore({
        ddp: {
          resources: {
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
        type: DDP_RESOURCE_REQUEST,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
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
    }
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

  test('should dispatch DDP_RESOURCE_DELETE on resource release', () => {
    const store = testContext.mockStore({
      ddp: {
        resources: {
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
            socketId: 'socket/1',
          },
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
    }
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
    }
  );

  test('should deprecate resources on re-connect', () => {
    const store = testContext.mockStore({
      ddp: {
        resources: {
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
        type: DDP_RESOURCE_REFETCH,
        payload: {
          name: 'aQuery',
          params: [1, 2, 3],
          properties: {
            socketId: 'socket/1',
          },
        },
        meta: {
          resourceId: '1',
        },
      },
    ]);
  });

  test(
    'should dispatch DDP_RESOURCE_REFETCH on DDP_RESOURCE_DEPRECATE',
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
                socketId: 'socket/1',
              },
              users: 1,
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
        {
          type: DDP_RESOURCE_REFETCH,
          payload: {
            name: 'aQuery',
            params: [1, 2, 3],
            properties: {
              socketId: 'socket/1',
            },
          },
          meta: {
            resourceId: '1',
          },
        },
      ]);
    }
  );

  test(
    'should not dispatch DDP_RESOURCE_REFETCH on DDP_RESOURCE_DEPRECATE if resource has no users',
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
    }
  );
});
