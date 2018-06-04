/* eslint-env jest */
/* eslint no-invalid-this: "off" */

import { createReducer } from './reducer';
import {
  DDP_ENQUEUE,
  DDP_METHOD,
  DDP_UPDATED,
  DDP_RESULT,
  DDP_CANCEL,

  DDP_METHOD_STATE__QUEUED,
  DDP_METHOD_STATE__PENDING,
  DDP_METHOD_STATE__UPDATED,
  DDP_METHOD_STATE__RETURNED,
} from '../../constants';
import { DDPClient } from './testCommon';

describe('Test module - methods - reducer', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.reducer = createReducer(DDPClient);
  });

  test('should initialize state', () => {
    expect(testContext.reducer(undefined, {})).toEqual({});
  });

  test('should add new method', () => {
    expect(testContext.reducer({}, {
      type: DDP_METHOD,
      payload: {
        id: '1',
        method: 'methodA',
        params: [1, 2, 3],
      },
      meta: {
        methodId: '1',
        socketId: 'socket/1',
      },
    })).toEqual({
      1: {
        id: '1',
        name: 'methodA',
        params: [1, 2, 3],
        state: DDP_METHOD_STATE__PENDING,
        socketId: 'socket/1',
      },
    });
  });

  test('should add method in "queued" state', () => {
    expect(testContext.reducer({}, {
      type: DDP_ENQUEUE,
      payload: {
      },
      meta: {
        type: DDP_METHOD,
        methodId: '1',
      },
    })).toEqual({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__QUEUED,
      },
    });
  });

  test(
    'should switch state from "queued" to "pending" on DDP_METHOD',
    () => {
      expect(testContext.reducer({
        1: {
          state: DDP_METHOD_STATE__QUEUED,
        },
      }, {
        type: DDP_METHOD,
        payload: {
          method: 'methodA',
          params: [],
        },
        meta: {
          methodId: '1',
        },
      })).toEqual({
        1: {
          id: '1',
          state: DDP_METHOD_STATE__PENDING,
          name: 'methodA',
          params: [],
        },
      });
    },
  );

  test('should change method state to "returned"', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__PENDING,
      },
    }, {
      type: DDP_RESULT,
      payload: {
        id: '1',
      },
      meta: {
        methodId: '1',
      },
    })).toEqual({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__RETURNED,
        result: undefined,
        error: undefined,
      },
    });
  });

  test('should change method state to "updated"', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__PENDING,
      },
    }, {
      type: DDP_UPDATED,
      payload: {
        methods: ['1'],
      },
      meta: {},
    })).toEqual({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__UPDATED,
      },
    });
  });

  test('should remove method if it is already updated', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__UPDATED,
      },
    }, {
      type: DDP_RESULT,
      payload: {
        id: '1',
      },
      meta: {
        methodId: '1',
      },
    })).toEqual({});
  });

  test('should remove method if it already returned', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__RETURNED,
      },
    }, {
      type: DDP_UPDATED,
      payload: {
        methods: ['1', '2'],
      },
    })).toEqual({});
  });

  test('should remove method if it is canceled', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_METHOD_STATE__PENDING,
      },
    }, {
      type: DDP_CANCEL,
      meta: {
        methodId: '1',
      },
    })).toEqual({});
  });
});
