/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import configureStore from 'redux-mock-store';
import {
  createMiddleware,
} from './middleware';
import {
  DEFAULT_SOCKET_ID,

  DDP_SUBSCRIPTION_STATE__READY,

  DDP_SUBSCRIBE,
  DDP_UNSUBSCRIBE,

  DDP_SUB,
  DDP_UNSUB,
  DDP_CONNECT,
  DDP_ENQUEUE,
} from '../../constants';
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);

describe('Test module - subscriptions - middleware', () => {
  beforeEach(function () {
    this.clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    this.clock.restore();
  });

  beforeEach(function () {
    this.send = sinon.spy();
    this.ddpClient = new DDPClient();
    this.ddpClient.socket.send = this.send;
    this.ddpClient.nextUniqueId = () => '1';
    this.middleware = createMiddleware(this.ddpClient);
    this.mockStore = configureStore([
      this.middleware,
    ]);
  });

  it('should pass through an unknown action', function () {
    const store = this.mockStore();
    const action = {
      type: 'unknown',
      payload: {},
    };
    store.dispatch(action);
    store.getActions().should.have.members([
      action,
    ]);
  });

  it('should dispatch SUB if not yet subscribed', function () {
    const store = this.mockStore({
      ddp: {
        subscriptions: {
        },
      },
    });
    const action = {
      type: DDP_SUBSCRIBE,
      payload: {
        name: 'aSubscription',
        params: [1, 2, 3],
      },
      meta: {
        socketId: 'socket/1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      {
        type: DDP_SUB,
        payload: {
          id: '1',
          name: 'aSubscription',
          params: [1, 2, 3],
        },
        meta: {
          subId: '1',
          socketId: 'socket/1',
        },
      },
      {
        ...action,
        payload: {
          ...action.payload,
          id: '1',
        },
        meta: {
          subId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });

  it('should attach subId to metadata on DDP_SUB', function () {
    const store = this.mockStore({
      ddp: {
        subscriptions: {
        },
      },
    });
    store.dispatch({
      type: DDP_SUB,
      payload: {
        id: '1',
      },
    });
    store.getActions().should.deep.equal([
      {
        type: DDP_SUB,
        payload: {
          id: '1',
        },
        meta: {
          subId: '1',
        },
      },
    ]);
  });

  it('should attach subId to metadata on DDP_ENQUEUE', function () {
    const store = this.mockStore({
      ddp: {
        subscriptions: {
        },
      },
    });
    store.dispatch({
      type: DDP_ENQUEUE,
      payload: {
        id: '1',
      },
      meta: {
        type: DDP_SUB,
      },
    });
    store.getActions().should.deep.equal([
      {
        type: DDP_ENQUEUE,
        payload: {
          id: '1',
        },
        meta: {
          type: DDP_SUB,
          subId: '1',
        },
      },
    ]);
  });

  it('should not dispatch SUB if already subscribed', function () {
    const store = this.mockStore({
      ddp: {
        subscriptions: {
          1: {
            id: '1',
            state: DDP_SUBSCRIPTION_STATE__READY,
            name: 'aSubscription',
            params: [1, 2, 3],
            users: 1,
            socketId: DEFAULT_SOCKET_ID,
          },
        },
      },
    });
    const action = {
      type: DDP_SUBSCRIBE,
      payload: {
        name: 'aSubscription',
        params: [1, 2, 3],
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      {
        ...action,
        payload: {
          ...action.payload,
          id: '1',
        },
        meta: {
          subId: '1',
          socketId: DEFAULT_SOCKET_ID,
        },
      },
    ]);
  });

  it('should do nothing if unsubscribe on unknown id', function () {
    const store = this.mockStore({
      ddp: {
        subscriptions: {
        },
      },
    });
    const action = {
      type: DDP_UNSUBSCRIBE,
      meta: {
        subId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
    ]);
  });

  it('should dispatch UNSUB on unsubscribe', function () {
    const store = this.mockStore({
      ddp: {
        subscriptions: {
          1: {
            id: '1',
            state: DDP_SUBSCRIPTION_STATE__READY,
            name: 'aSubscription',
            params: [1, 2, 3],
            users: 1,
          },
        },
      },
    });
    const action = {
      type: DDP_UNSUBSCRIBE,
      meta: {
        subId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
    ]);

    this.clock.tick(30000);
    store.getActions().should.deep.equal([
      action,
      {
        type: DDP_UNSUB,
        payload: {
          id: '1',
        },
        meta: {
          subId: '1',
        },
      },
    ]);
  });

  it('should not dispatch UNSUB on unsubscribe then subscribe again', function () {
    const store = this.mockStore({
      ddp: {
        subscriptions: {
          1: {
            id: '1',
            state: DDP_SUBSCRIPTION_STATE__READY,
            name: 'aSubscription',
            params: [1, 2, 3],
            users: 1,
            socketId: DEFAULT_SOCKET_ID,
          },
        },
      },
    });
    const action1 = {
      type: DDP_UNSUBSCRIBE,
      meta: {
        subId: '1',
      },
    };
    const action2 = {
      type: DDP_SUBSCRIBE,
      payload: {
        id: '1',
        name: 'aSubscription',
        params: [1, 2, 3],
      },
      meta: {
        socketId: DEFAULT_SOCKET_ID,
      },
    };
    store.dispatch(action1);
    store.dispatch(action2);
    store.getActions().should.deep.equal([
      action1,
      {
        ...action2,
        meta: {
          ...action2.meta,
          subId: '1',
        },
      },
    ]);

    this.clock.tick(30000);
    store.getActions().should.deep.equal([
      action1,
      {
        ...action2,
        meta: {
          ...action2.meta,
          subId: '1',
        },
      },
    ]);
  });

  it('should not dispatch UNSUB if there are many users', function () {
    const store = this.mockStore({
      ddp: {
        subscriptions: {
          1: {
            id: '1',
            state: DDP_SUBSCRIPTION_STATE__READY,
            name: 'aSubscription',
            params: [1, 2, 3],
            users: 2,
          },
        },
      },
    });
    const action = {
      type: DDP_UNSUBSCRIBE,
      meta: {
        subId: '1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
    ]);

    this.clock.tick(30000);
    store.getActions().should.deep.equal([
      action,
    ]);
  });

  it('should re-subscribe on re-connect', function () {
    const store = this.mockStore({
      ddp: {
        subscriptions: {
          1: {
            id: '1',
            state: DDP_SUBSCRIPTION_STATE__READY,
            name: 'aSubscription',
            params: [1, 2, 3],
            users: 1,
            socketId: 'socket/1',
          },
          2: {
            id: '1',
            state: DDP_SUBSCRIPTION_STATE__READY,
            name: 'aSubscription',
            params: [1, 2, 3],
            users: 1,
            socketId: 'socket/2',
          },
        },
      },
    });
    const action = {
      type: DDP_CONNECT,
      payload: {},
      meta: {
        socketId: 'socket/1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
      {
        type: DDP_SUB,
        payload: {
          id: '1',
          name: 'aSubscription',
          params: [1, 2, 3],
        },
        meta: {
          subId: '1',
          socketId: 'socket/1',
        },
      },
    ]);
  });
});
