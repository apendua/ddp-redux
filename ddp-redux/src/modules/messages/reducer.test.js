/* eslint-env jest */

import {
  createSocketReducer,
} from './reducer';
import {
  DDP_METHOD,
  DDP_CONNECTED,
  DDP_RESULT,
  DDP_ENQUEUE,
  DDP_DISCONNECTED,

  MSG_METHOD,
} from '../../constants';
import {
  DDPClient,
} from './testCommon';

describe('Test module - messages - reducer', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.reducer = createSocketReducer(DDPClient);
  });

  test('should initialize state', () => {
    expect(testContext.reducer(undefined, {})).toEqual({
      pending: {
        '[connect]': 100,
      },
      queue: [],
    });
  });

  test('should reset pending on conection close', () => {
    expect(testContext.reducer({
      queue: [],
      pending: {
        1: 1,
      },
    }, {
      type: DDP_DISCONNECTED,
    })).toEqual({
      pending: {
        '[connect]': 100,
      },
      queue: [],
    });
  });

  test('should enqueue element if queue is empty', () => {
    expect(testContext.reducer({
      queue: [],
      pending: {},
    }, {
      type: DDP_ENQUEUE,
      payload: {},
      meta: {
        type: DDP_METHOD,
        priority: 0,
      },
    })).toEqual({
      pending: {},
      queue: [{
        type: DDP_METHOD,
        meta: {
          priority: 0,
        },
        payload: {},
      }],
    });
  });

  test(
    'should enqueue element at the end of queue if priority is lower',
    () => {
      expect(testContext.reducer({
        queue: [{
          type: DDP_METHOD,
          payload: 1,
          meta: {
            priority: 10,
          },
        }],
        pending: {},
      }, {
        type: DDP_ENQUEUE,
        payload: 2,
        meta: {
          type: DDP_METHOD,
          priority: 5,
        },
      })).toEqual({
        pending: {},
        queue: [{
          type: DDP_METHOD,
          payload: 1,
          meta: {
            priority: 10,
          },
        }, {
          type: DDP_METHOD,
          payload: 2,
          meta: {
            priority: 5,
          },
        }],
      });
    }
  );

  test(
    'should enqueue element at the beginning of queue if priority is higher',
    () => {
      expect(testContext.reducer({
        queue: [{
          type: DDP_METHOD,
          meta: {
            priority: 10,
          },
          payload: 1,
        }],
        pending: {},
      }, {
        type: DDP_ENQUEUE,
        payload: 2,
        meta: {
          type: DDP_METHOD,
          priority: 15,
        },
      })).toEqual({
        pending: {},
        queue: [{
          type: DDP_METHOD,
          meta: {
            priority: 15,
          },
          payload: 2,
        }, {
          type: DDP_METHOD,
          meta: {
            priority: 10,
          },
          payload: 1,
        }],
      });
    }
  );

  test('should enqueue element in the middle of the queue', () => {
    expect(testContext.reducer({
      queue: [{
        type: DDP_METHOD,
        meta: {
          priority: 20,
        },
        payload: 1,
      }, {
        type: DDP_METHOD,
        meta: {
          priority: 10,
        },
        payload: 2,
      }],
      pending: {},
    }, {
      type: DDP_ENQUEUE,
      payload: 3,
      meta: {
        type: DDP_METHOD,
        priority: 15,
      },
    })).toEqual({
      pending: {},
      queue: [{
        type: DDP_METHOD,
        meta: {
          priority: 20,
        },
        payload: 1,
      }, {
        type: DDP_METHOD,
        meta: {
          priority: 15,
        },
        payload: 3,
      }, {
        type: DDP_METHOD,
        meta: {
          priority: 10,
        },
        payload: 2,
      }],
    });
  });

  test('should remove method from queue when method is emited', () => {
    const action = {
      type: DDP_METHOD,
      payload: {
        id: '1',
        msg: MSG_METHOD,
      },
      meta: {
        priority: 0,
      },
    };
    expect(testContext.reducer({
      queue: [{
        type: DDP_METHOD,
        payload: action.payload,
        meta: action.meta,
      }],
      pending: {},
    }, action)).toEqual({
      pending: {
        1: 0,
      },
      queue: [],
    });
  });

  test('should remove pending item on method result', () => {
    const action = {
      type: DDP_RESULT,
      payload: {
        id: '1',
      },
    };
    expect(testContext.reducer({
      queue: [],
      pending: {
        1: 0,
        2: 0,
      },
    }, action)).toEqual({
      pending: {
        2: 0,
      },
      queue: [],
    });
  });

  test('should remove all pending items on connected', () => {
    const action = {
      type: DDP_CONNECTED,
    };
    expect(testContext.reducer({
      queue: [],
      pending: {
        1: 0,
        2: 0,
      },
    }, action)).toEqual({
      pending: {},
      queue: [],
    });
  });
});
