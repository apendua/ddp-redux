/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */
/* eslint no-invalid-this: "off" */

import chai from 'chai';
import sinonChai from 'sinon-chai';
import {
  createReducer,
} from './reducer';
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
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);

describe('Test module - subscriptions - reducer', () => {
  beforeEach(function () {
    this.reducer = createReducer(DDPClient);
  });

  it('should initialize state', function () {
    this.reducer(undefined, {}).should.deep.equal({});
  });

  it('should create a new subscription', function () {
    this.reducer({}, {
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
    }).should.deep.equal({
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

  it('should switch state from "initial" to "pending" on DDP_SUB', function () {
    this.reducer({
      1: {
        state: DDP_SUBSCRIPTION_STATE__INITIAL,
      },
    }, {
      type: DDP_SUB,
      meta: {
        subId: '1',
      },
    }).should.deep.equal({
      1: {
        state: DDP_SUBSCRIPTION_STATE__PENDING,
      },
    });
  });

  it('should switch state from "queued" to "pending" on DDP_SUB', function () {
    this.reducer({
      1: {
        state: DDP_SUBSCRIPTION_STATE__QUEUED,
      },
    }, {
      type: DDP_SUB,
      meta: {
        subId: '1',
      },
    }).should.deep.equal({
      1: {
        state: DDP_SUBSCRIPTION_STATE__PENDING,
      },
    });
  });

  it('should not change "restoring" state on DDP_SUB', function () {
    this.reducer({
      1: {
        state: DDP_SUBSCRIPTION_STATE__RESTORING,
      },
    }, {
      type: DDP_SUB,
      meta: {
        subId: '1',
      },
    }).should.deep.equal({
      1: {
        state: DDP_SUBSCRIPTION_STATE__RESTORING,
      },
    });
  });

  it('should switch subscription state from "initial" to "queued"', function () {
    this.reducer({
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
    }).should.deep.equal({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__QUEUED,
      },
    });
  });

  it('should not switch subscription state from "restoring" to "queued"', function () {
    this.reducer({
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
    }).should.deep.equal({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__RESTORING,
      },
    });
  });

  it('should set default socket id if missing', function () {
    this.reducer({}, {
      type: DDP_SUBSCRIBE,
      payload: {
        id: '1',
        name: 'aSubscription',
        params: [1, 2, 3],
      },
      meta: {
        subId: '1',
      },
    }).should.deep.equal({
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

  it('should update subscription state to ready', function () {
    this.reducer({
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
    }).should.deep.equal({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__READY,
        name: 'aSubscription',
        params: [1, 2, 3],
      },
    });
  });

  it('should omit subscription that might have been deleted in the meantime', function () {
    this.reducer({}, {
      type: DDP_READY,
      payload: {
        msg: 'ready',
        subs: ['1'],
      },
    }).should.deep.equal({});
  });

  it('should update subscription state to error', function () {
    this.reducer({
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
    }).should.deep.equal({
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

  it('should omit subscription that might have been deleted in the meantime', function () {
    this.reducer({}, {
      type: DDP_NOSUB,
      payload: {
        msg: 'nosub',
        id: '1',
      },
    }).should.deep.equal({});
  });

  it('should increase the number of users', function () {
    this.reducer({
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
    }).should.deep.equal({
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

  it('should decrease the number of users', function () {
    this.reducer({
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
    }).should.deep.equal({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__READY,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 0,
      },
    });
  });

  it('should delete subscription', function () {
    this.reducer({
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
    }).should.deep.equal({
      1: {
        id: '1',
        state: DDP_SUBSCRIPTION_STATE__READY,
        name: 'aSubscription',
        params: [1, 2, 3],
        users: 1,
      },
    });
  });

  it('should put subscription in restoring state', function () {
    this.reducer({
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
    }).should.deep.equal({
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

