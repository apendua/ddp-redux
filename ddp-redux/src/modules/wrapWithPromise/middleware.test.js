/* eslint-env jest */
/* eslint no-invalid-this: "off" */

import configureStore from 'redux-mock-store';
import {
  createMiddleware,
} from './middleware';
import {
  DDP_METHOD,
  DDP_UPDATED,
  DDP_RESULT,
  DDP_CANCEL,

  DDP_METHOD_STATE__PENDING,
  DDP_METHOD_STATE__UPDATED,
  DDP_METHOD_STATE__RETURNED,
} from '../../constants';
import {
  DDPClient,
} from './testCommon';

const createInitialState = (methodId, methodState) => ({
  ddp: {
    methods: {
      [methodId]: methodState,
    },
  },
});

describe('Test module - wrapWithPromise - middleware', () => {
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

  test('should return a promise when method is dispatched', () => {
    const store = testContext.mockStore();
    const action = {
      type: DDP_METHOD,
      payload: {
        id: '1',
      },
    };
    expect(store.dispatch(action)).toBeInstanceOf(Promise);
    expect(store.getActions()).toEqual([action]);
  });

  test(
    'should resolve a promise when method returns after being updated',
    () => {
      const store = testContext.mockStore(createInitialState('1', {
        state: DDP_METHOD_STATE__UPDATED,
      }));
      const assertion = expect(store.dispatch({
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
      })).resolves.toBe(1);
      store.dispatch({
        type: DDP_RESULT,
        payload: {
          id: '1',
          result: 1,
        },
      });
      return assertion;
    },
  );

  test(
    'should reject a promise when method returns after being updated',
    () => {
      const store = testContext.mockStore(createInitialState('1', {
        state: DDP_METHOD_STATE__UPDATED,
      }));
      const assertion = expect(store.dispatch({
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
      })).rejects.toThrow('Error');
      store.dispatch({
        type: DDP_RESULT,
        payload: {
          id: '1',
          error: {
            error: 'Error',
          },
        },
      });
      return assertion;
    },
  );

  test(
    'should resolve a promise when method is updated after returning',
    () => {
      const store = testContext.mockStore(createInitialState('1', {
        state: DDP_METHOD_STATE__RETURNED,
        result: 1,
      }));
      const assertion = expect(store.dispatch({
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
      })).resolves.toBe(1);
      store.dispatch({
        type: DDP_UPDATED,
        payload: {
          methods: ['1', '2'],
        },
      });
      return assertion;
    }
  );

  test(
    'should reject a promise when method is updated after returning',
    () => {
      const store = testContext.mockStore(createInitialState('1', {
        state: DDP_METHOD_STATE__RETURNED,
        error: {
          error: 'Error',
        },
      }));
      const assertion = expect(store.dispatch({
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
      })).rejects.toThrow('Error');
      store.dispatch({
        type: DDP_UPDATED,
        payload: {
          methods: ['1', '2'],
        },
      });
      return assertion;
    },
  );

  test('should resolve a promise when method is canceled', () => {
    const store = testContext.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__PENDING,
      socketId: '1',
    }));
    const assertion = expect(store.dispatch({
      type: DDP_METHOD,
      payload: {
        id: '1',
      },
      meta: {
        methodId: '1',
      },
    })).resolves.toBe(1);
    store.dispatch({
      type: DDP_CANCEL,
      payload: 1,
      meta: {
        methodId: '1',
        socketId: '1',
      },
    });
    expect(store.getActions()).toEqual([
      {
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
        meta: {
          methodId: '1',
        },
      },
      {
        type: DDP_CANCEL,
        payload: 1,
        meta: {
          methodId: '1',
          socketId: '1',
        },
      },
    ]);
    return assertion;
  });

  test('should reject a promise when method is canceled', () => {
    const store = testContext.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__PENDING,
      socketId: '1',
    }));
    const assertion = expect(store.dispatch({
      type: DDP_METHOD,
      payload: {
        id: '1',
      },
      meta: {
        methodId: '1',
      },
    })).rejects.toThrow('Error');
    store.dispatch({
      type: DDP_CANCEL,
      error: true,
      payload: {
        error: 'Error',
      },
      meta: {
        methodId: '1',
        socketId: '1',
      },
    });
    expect(store.getActions()).toEqual([
      {
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
        meta: {
          methodId: '1',
        },
      },
      {
        type: DDP_CANCEL,
        error: true,
        payload: {
          error: 'Error',
        },
        meta: {
          methodId: '1',
          socketId: '1',
        },
      },
    ]);
    return assertion;
  });
});

