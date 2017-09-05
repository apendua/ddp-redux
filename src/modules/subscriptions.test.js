/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import configureStore from 'redux-mock-store';
import DDPEmitter from '../DDPEmitter';
import {
  createReducer,
  createMiddleware,
} from './subscriptions';
import {
  DDP_SUBSCRIPTION_STATE__RESTORING,
  DDP_SUBSCRIPTION_STATE__PENDING,
  DDP_SUBSCRIPTION_STATE__READY,
  DDP_SUBSCRIPTION_STATE__ERROR,

  DDP_CONNECTION_STATE__CONNECTED,
  DDP_CONNECTION_STATE__DISCONNECTED,

  DDP_SUBSCRIBE,
  DDP_UNSUBSCRIBE,

  DDP_SUB,
  DDP_UNSUB,
  DDP_READY,
  DDP_NOSUB,
  DDP_CONNECT,
} from '../constants';

class DDPClient {
  constructor() {
    this.socket = new DDPEmitter();
  }
}

chai.should();
chai.use(sinonChai);

describe('Test module - subscriptions', () => {
  describe('Reducer', () => {
    beforeEach(function () {
      this.reducer = createReducer(DDPClient);
    });

    it('should initialize state', function () {
      this.reducer(undefined, {}).should.deep.equal({});
    });

    it('should create a new subscription', function () {
      this.reducer({}, {
        type: DDP_SUB,
        payload: {
          msg: 'sub',
          id: '1',
          name: 'aSubscription',
          params: [1, 2, 3],
        },
        meta: {
          socketId: 'socket/1',
        },
      }).should.deep.equal({
        1: {
          id: '1',
          state: DDP_SUBSCRIPTION_STATE__PENDING,
          name: 'aSubscription',
          params: [1, 2, 3],
          socketId: 'socket/1',
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
      }).should.deep.equal({
        1: {
          id: '1',
          state: DDP_SUBSCRIPTION_STATE__ERROR,
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
        },
      }, {
        type: DDP_SUBSCRIBE,
        payload: {
          id: '1', // this is usually added by middleware
          name: 'aSubscription',
          params: [1, 2, 3],
        },
      }).should.deep.equal({
        1: {
          id: '1',
          state: DDP_SUBSCRIPTION_STATE__PENDING,
          name: 'aSubscription',
          params: [1, 2, 3],
          users: 1,
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
        payload: {
          msg: 'unsub',
          id: '2',
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
        },
        2: {
          id: '2',
          state: DDP_SUBSCRIPTION_STATE__PENDING,
          name: 'aSubscription',
          params: [1, 2, 3],
          users: 1,
        },
      }, {
        type: DDP_CONNECT,
        payload: {
          msg: 'connect',
        },
      }).should.deep.equal({
        1: {
          id: '1',
          state: DDP_SUBSCRIPTION_STATE__RESTORING,
          name: 'aSubscription',
          params: [1, 2, 3],
          users: 1,
        },
        2: {
          id: '2',
          state: DDP_SUBSCRIPTION_STATE__PENDING,
          name: 'aSubscription',
          params: [1, 2, 3],
          users: 1,
        },
      });
    });
  });

  describe('Middleware', () => {
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

    it('should not dispatch SUB if not yet subscribed', function () {
      const store = this.mockStore({
        ddp: {
          connection: {
            state: DDP_CONNECTION_STATE__CONNECTED,
          },
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
      };
      store.dispatch(action);
      store.getActions().should.deep.equal([
        {
          type: DDP_SUB,
          payload: {
            msg: 'sub',
            id: '1',
            name: 'aSubscription',
            params: [1, 2, 3],
          },
        },
        {
          ...action,
          payload: {
            ...action.payload,
            id: '1',
          },
        },
      ]);
    });

    it('should not dispatch SUB if already subscribed', function () {
      const store = this.mockStore({
        ddp: {
          connection: {
            state: DDP_CONNECTION_STATE__CONNECTED,
          },
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
        },
      ]);
    });

    it('should do nothing if unsubscribe on unknown id', function () {
      const store = this.mockStore({
        ddp: {
          connection: {
            state: DDP_CONNECTION_STATE__CONNECTED,
          },
          subscriptions: {
          },
        },
      });
      const action = {
        type: DDP_UNSUBSCRIBE,
        payload: {
          id: '1',
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
          connection: {
            state: DDP_CONNECTION_STATE__CONNECTED,
          },
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
        payload: {
          id: '1',
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
            msg: 'unsub',
            id: '1',
          },
        },
      ]);
    });

    it('should not dispatch UNSUB if there are many users', function () {
      const store = this.mockStore({
        ddp: {
          connection: {
            state: DDP_CONNECTION_STATE__CONNECTED,
          },
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
        payload: {
          id: '1',
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
          connection: {
            state: DDP_CONNECTION_STATE__DISCONNECTED,
          },
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
            msg: 'sub',
            id: '1',
            name: 'aSubscription',
            params: [1, 2, 3],
          },
          meta: {
            socketId: 'socket/1',
          },
        },
      ]);
    });
  });
});
