/* eslint-env jest */

import configureStore from 'redux-mock-store';
import { createMiddleware } from './middleware';
import { DDP_ENQUEUE } from '../../constants';

const createInitialState = (queueId, queueState) => ({
  ddp: {
    queues: {
      [queueId]: queueState,
    },
  },
});

describe('Test module - queues - middleware', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.send = jest.fn();
    testContext.onError = jest.fn();
    testContext.middleware = createMiddleware();
    testContext.mockStore = configureStore([
      testContext.middleware,
    ]);
  });

  test('should pass an action without queue meta field', () => {
    const store = testContext.mockStore();
    const action = {
      type: 'no_meta_queue',
      payload: {},
      meta: {},
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual(expect.arrayContaining([
      action,
    ]));
  });

  test('should enqueue action if priority is too low', () => {
    const store = testContext.mockStore(createInitialState('1', {
      pending: {
        1: 20,
        2: 30,
      },
      elements: [],
    }));
    const action = {
      type: 'action',
      payload: {
        id: '2',
      },
      meta: {
        queue: {
          id: '1',
          priority: 25,
        },
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
      elements: [{
        type: 'action',
        payload: {
          id: '3',
        },
        meta: {
          queue: {
            id: '1',
            priority: 10,
          },
        },
      }, {
        type: 'action',
        payload: {
          id: '4',
        },
        meta: {
          queue: {
            id: '1',
            priority: 10,
          },
        },
      }, {
        type: 'action',
        payload: {
          id: '5',
        },
        meta: {
          queue: {
            id: '1',
            priority: 0,
          },
        },
      }],
    }));
    const action = {
      type: 'action',
      payload: 4,
      meta: {
        queue: {
          id: '1',
          resolve: true,
        },
      },
    };
    store.dispatch(action);
    expect(store.getActions()).toEqual([
      action,
      {
        type: 'action',
        payload: {
          id: '3',
        },
        meta: {
          queue: {
            id: '1',
            priority: 10,
          },
        },
      },
      {
        type: 'action',
        payload: {
          id: '4',
        },
        meta: {
          queue: {
            id: '1',
            priority: 10,
          },
        },
      },
    ]);
  });
});
