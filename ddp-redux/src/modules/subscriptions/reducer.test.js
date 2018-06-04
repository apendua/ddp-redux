/* eslint-env jest */
/* eslint no-invalid-this: "off" */

import { createReducer } from './reducer';
import {
  DEFAULT_SOCKET_ID,

  DDP_SUBSCRIPTION_STATE__INITIAL,
  DDP_SUBSCRIPTION_STATE__QUEUED,
  DDP_SUBSCRIPTION_STATE__RESTORING,
  DDP_SUBSCRIPTION_STATE__PENDING,
  DDP_SUBSCRIPTION_STATE__READY,

  DDP_SUBSCRIBE,
  DDP_UNSUBSCRIBE,

  DDP_SUB,
  DDP_ENQUEUE,
  DDP_UNSUB,
  DDP_READY,
  DDP_NOSUB,
  DDP_CONNECT,
} from '../../constants';
import { DDPClient } from './testCommon';

describe('Test module - subscriptions - reducer', () => {
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

  test('should create a new subscription', () => {
    expect(testContext.reducer({}, {
      type: DDP_SUBSCRIBE,
      payload: {
        id: '1',
        name: 'aSubscription',
        params: [1, 2, 3],
      },
      meta: {
        subId: '1',
        socketId: 'socket/1',
      },
    })).toEqual({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__INITIAL,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 1,
        socketId: 'socket/1',
      },
    });
  });

  test(
    'should switch state from "initial" to "pending" on DDP_SUB',
    () => {
      expect(testContext.reducer({
        1: {
          state: DDP_SUBSCRIPTION_STATE__INITIAL,
        },
      }, {
        type: DDP_SUB,
        meta: {
          subId: '1',
        },
      })).toEqual({
        1: {
          state: DDP_SUBSCRIPTION_STATE__PENDING,
        },
      });
    },
  );

  test('should switch state from "queued" to "pending" on DDP_SUB', () => {
    expect(testContext.reducer({
      1: {
        state: DDP_SUBSCRIPTION_STATE__QUEUED,
      },
    }, {
      type: DDP_SUB,
      meta: {
        subId: '1',
      },
    })).toEqual({
      1: {
        state: DDP_SUBSCRIPTION_STATE__PENDING,
      },
    });
  });

  test('should not change "restoring" state on DDP_SUB', () => {
    expect(testContext.reducer({
      1: {
        state: DDP_SUBSCRIPTION_STATE__RESTORING,
      },
    }, {
      type: DDP_SUB,
      meta: {
        subId: '1',
      },
    })).toEqual({
      1: {
        state: DDP_SUBSCRIPTION_STATE__RESTORING,
      },
    });
  });

  test(
    'should switch subscription state from "initial" to "queued"',
    () => {
      expect(testContext.reducer({
        1: {
          id: '1',
          state: DDP_SUBSCRIPTION_STATE__INITIAL,
        },
      }, {
        type: DDP_ENQUEUE,
        payload: {
        },
        meta: {
          type: DDP_SUB,
          subId: '1',
        },
      })).toEqual({
        1: {
          id: '1',
          state: DDP_SUBSCRIPTION_STATE__QUEUED,
        },
      });
    },
  );

  test(
    'should not switch subscription state from "restoring" to "queued"',
    () => {
      expect(testContext.reducer({
        1: {
          id: '1',
          state: DDP_SUBSCRIPTION_STATE__RESTORING,
        },
      }, {
        type: DDP_ENQUEUE,
        payload: {
        },
        meta: {
          type: DDP_SUB,
          subId: '1',
        },
      })).toEqual({
        1: {
          id: '1',
          state: DDP_SUBSCRIPTION_STATE__RESTORING,
        },
      });
    },
  );

  test('should set default socket id if missing', () => {
    expect(testContext.reducer({}, {
      type: DDP_SUBSCRIBE,
      payload: {
        id: '1',
        name: 'aSubscription',
        params: [1, 2, 3],
      },
      meta: {
        subId: '1',
      },
    })).toEqual({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__INITIAL,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 1,
        socketId: DEFAULT_SOCKET_ID,
      },
    });
  });

  test('should update subscription state to ready', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__PENDING,
        name: 'aSubscription',
        params: [1, 2, 3],
      },
    }, {
      type: DDP_READY,
      payload: {
        msg: 'ready',
        subs: ['1'],
      },
    })).toEqual({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__READY,
        name: 'aSubscription',
        params: [1, 2, 3],
      },
    });
  });

  test(
    'should omit subscription that might have been deleted in the meantime',
    () => {
      expect(testContext.reducer({}, {
        type: DDP_READY,
        payload: {
          msg: 'ready',
          subs: ['1'],
        },
      })).toEqual({});
    },
  );

  test('should update subscription state to error', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__PENDING,
        name: 'aSubscription',
        params: [1, 2, 3],
      },
    }, {
      type: DDP_NOSUB,
      payload: {
        msg: 'error',
        id: '1',
        error: {
          errorType: 'Meteor.Error',
        },
      },
      meta: {
        subId: '1',
      },
    })).toEqual({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__READY,
        error: {
          errorType: 'Meteor.Error',
        },
        name: 'aSubscription',
        params: [1, 2, 3],
      },
    });
  });

  test(
    'should omit subscription that might have been deleted in the meantime',
    () => {
      expect(testContext.reducer({}, {
        type: DDP_NOSUB,
        payload: {
          msg: 'nosub',
          id: '1',
        },
      })).toEqual({});
    },
  );

  test('should increase the number of users', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__PENDING,
        name: 'aSubscription',
        params: [1, 2, 3],
        socketId: 'socket/1',
      },
    }, {
      type: DDP_SUBSCRIBE,
      payload: {
        id: '1', // this is usually added by middleware
        name: 'aSubscription',
        params: [1, 2, 3],
      },
      meta: {
        subId: '1',
        socketId: 'socket/1',
      },
    })).toEqual({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__PENDING,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 1,
        socketId: 'socket/1',
      },
    });
  });

  test('should decrease the number of users', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__READY,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 1,
      },
    }, {
      type: DDP_UNSUBSCRIBE,
      payload: {
        id: '1',
      },
      meta: {
        subId: '1',
      },
    })).toEqual({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__READY,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 0,
      },
    });
  });

  test('should delete subscription', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__READY,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 1,
      },
      2: {
        id: '2',
        state: DDP_SUBSCRIPTION_STATE__READY,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 0,
      },
    }, {
      type: DDP_UNSUB,
      meta: {
        subId: '2',
      },
    })).toEqual({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__READY,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 1,
      },
    });
  });

  test('should put subscription in restoring state', () => {
    expect(testContext.reducer({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__READY,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 1,
        meta: {
          socketId: 'socket/1',
        },
      },
      2: {
        id: '2',
        state: DDP_SUBSCRIPTION_STATE__PENDING,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 1,
        meta: {
          socketId: 'socket/1',
        },
      },
    }, {
      type: DDP_CONNECT,
      payload: {
      },
      meta: {
        socketId: 'socket/1',
      },
    })).toEqual({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__RESTORING,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 1,
        meta: {
          socketId: 'socket/1',
        },
      },
      2: {
        id: '2',
        state: DDP_SUBSCRIPTION_STATE__PENDING,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 1,
        meta: {
          socketId: 'socket/1',
        },
      },
    });
  });
});

