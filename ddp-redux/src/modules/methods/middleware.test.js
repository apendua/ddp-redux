/* eslint-env jest */
/* eslint no-invalid-this: "off" */

import configureStore from 'redux-mock-store';
import {
  createMiddleware,
} from './middleware';
import DDPError from '../../DDPError';
import {
  DDP_METHOD,
  DDP_UPDATED,
  DDP_CONNECTED,
  DDP_DISCONNECTED,
  DDP_CANCEL,
  DDP_ENQUEUE,

  DDP_METHOD_STATE__PENDING,
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

describe('Test module - methods - middleware', () => {
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

  test('should attach method details to metadata on DDP_UPDATED', () => {
    const store = testContext.mockStore(createInitialState('1', {
      id: '1',
      state: DDP_METHOD_STATE__PENDING,
      socketId: '1',
    }));
    store.dispatch({
      type: DDP_UPDATED,
      payload: {
        methods: ['1', '2'],
      },
    });
    expect(store.getActions()).toEqual([
      {
        type: DDP_UPDATED,
        payload: {
          methods: ['1', '2'],
        },
        meta: {
          methods: [
            {
              id: '1',
              state: DDP_METHOD_STATE__PENDING,
              socketId: '1',
            },
            undefined, // unknown method
          ],
        },
      },
    ]);
  });

  test('should attach methodId to metadata on DDP_METHOD', () => {
    const store = testContext.mockStore({
      ddp: {
        methods: {
        },
      },
    });
    store.dispatch({
      type: DDP_METHOD,
      payload: {
        id: '1',
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
    ]);
  });

  test('should attach methodId to metadata on DDP_ENQUEUE', () => {
    const store = testContext.mockStore(createInitialState('1', {
      id: '1',
    }));
    store.dispatch({
      type: DDP_ENQUEUE,
      payload: {
        id: '1',
      },
      meta: {
        type: DDP_METHOD,
      },
    });
    expect(store.getActions()).toEqual([
      {
        type: DDP_ENQUEUE,
        payload: {
          id: '1',
        },
        meta: {
          type: DDP_METHOD,
          methodId: '1',
        },
      },
    ]);
  });

  test('should cancel pending methods if connection is lost', () => {
    const store = testContext.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__PENDING,
      name: 'A',
      socketId: '1',
    }));
    const action = {
      type: DDP_DISCONNECTED,
      payload: {
      },
      meta: {
        socketId: '1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
      {
        type: DDP_CANCEL,
        error: true,
        payload: {
          error: DDPError.ERROR_CONNECTION,
          reason: 'Connection was lost before method A returned',
          details: {
            state: DDP_METHOD_STATE__PENDING,
            name: 'A',
            socketId: '1',
          },
        },
        meta: {
          methodId: '1',
          socketId: '1',
        },
      },
    ]);
  });

  test('should not cancel pending methods if retry flag is set', () => {
    const store = testContext.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__PENDING,
      name: 'A',
      retry: true,
      socketId: '1',
    }));
    const action = {
      type: DDP_DISCONNECTED,
      payload: {
      },
      meta: {
        socketId: '1',
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
    ]);
  });

  test('should retry methods when connection is restored', () => {
    const store = testContext.mockStore(createInitialState('1', {
      state: DDP_METHOD_STATE__PENDING,
      name: 'A',
      socketId: '1',
      retry: true,
    }));
    const action = {
      type: DDP_CONNECTED,
      payload: {
      },
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
          id: '1',
          method: 'A',
          params: undefined,
        },
        meta: {
          socketId: '1',
          methodId: '1',
        },
      },
    ]);
  });
});

