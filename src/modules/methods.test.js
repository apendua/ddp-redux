/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import configureStore from 'redux-mock-store';
import DDPEmitter from '../DDPEmitter';
import {
  createReducer,
  createMiddleware,
} from './methods';
import DDPError from '../DDPError';
import {
  DDP_METHOD,
  DDP_UPDATED,
  DDP_CONNECTED,
  DDP_RESULT,
  DDP_CLOSED,
  DDP_CANCEL,

  DDP_METHOD_STATE__PENDING,
  DDP_METHOD_STATE__UPDATED,
  DDP_METHOD_STATE__RETURNED,
} from '../constants';

class DDPClient extends DDPEmitter {
  nextUniqueId() {
    return '1';
  }
}

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const createInitialState = (methodId, methodState) => ({
  ddp: {
    methods: {
      [methodId]: methodState,
    },
  },
});

describe('Test module - methods', () => {
  describe('Reducer', () => {
    beforeEach(function () {
      this.reducer = createReducer(DDPClient);
    });

    it('should initialize state', function () {
      this.reducer(undefined, {}).should.deep.equal({});
    });

    it('should add new method', function () {
      this.reducer({}, {
        type: DDP_METHOD,
        payload: {
          id: '1',
          method: 'methodA',
          params: [1, 2, 3],
        },
      }).should.deep.equal({
        1: {
          id: '1',
          name: 'methodA',
          params: [1, 2, 3],
          state: DDP_METHOD_STATE__PENDING,
        },
      });
    });

    it('should change method state to "returned"', function () {
      this.reducer({
        1: {
          id: '1',
          state: DDP_METHOD_STATE__PENDING,
        },
      }, {
        type: DDP_RESULT,
        payload: {
          id: '1',
        },
      }).should.deep.equal({
        1: {
          id: '1',
          state: DDP_METHOD_STATE__RETURNED,
          result: undefined,
          error: undefined,
        },
      });
    });

    it('should change method state to "updated"', function () {
      this.reducer({
        1: {
          id: '1',
          state: DDP_METHOD_STATE__PENDING,
        },
      }, {
        type: DDP_UPDATED,
        payload: {
          methods: ['1'],
        },
      }).should.deep.equal({
        1: {
          id: '1',
          state: DDP_METHOD_STATE__UPDATED,
        },
      });
    });

    it('should remove method if it is already updated', function () {
      this.reducer({
        1: {
          id: '1',
          state: DDP_METHOD_STATE__UPDATED,
        },
      }, {
        type: DDP_RESULT,
        payload: {
          id: '1',
        },
      }).should.deep.equal({});
    });

    it('should remove method if it already returned', function () {
      this.reducer({
        1: {
          id: '1',
          state: DDP_METHOD_STATE__RETURNED,
        },
      }, {
        type: DDP_UPDATED,
        payload: {
          methods: ['1', '2'],
        },
      }).should.deep.equal({});
    });

    it('should remove method if it is canceled', function () {
      this.reducer({
        1: {
          id: '1',
          state: DDP_METHOD_STATE__PENDING,
        },
      }, {
        type: DDP_CANCEL,
        meta: {
          id: '1',
        },
      }).should.deep.equal({});
    });
  });

  describe('Middleware', () => {
    beforeEach(function () {
      this.send = sinon.spy();
      this.onError = sinon.spy();
      this.ddpClient = new DDPClient();
      this.ddpClient.on('error', this.onError);
      this.ddpClient.send = this.send;
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

    it('should return a promise when method is dispatched', function () {
      const store = this.mockStore();
      const action = {
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
      };
      store.dispatch(action).should.be.instanceOf(Promise);
      store.getActions().should.deep.equal([{
        type: DDP_METHOD,
        payload: action.payload,
      }]);
    });

    it('should resolve a promise when method returns after being updated', function () {
      const store = this.mockStore(createInitialState('1', {
        state: DDP_METHOD_STATE__UPDATED,
      }));
      const assertion = store.dispatch({
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
      }).should.eventually.equal(1);
      store.dispatch({
        type: DDP_RESULT,
        payload: {
          id: '1',
          result: 1,
        },
      });
      return assertion;
    });

    it('should reject a promise when method returns after being updated', function () {
      const store = this.mockStore(createInitialState('1', {
        state: DDP_METHOD_STATE__UPDATED,
      }));
      const assertion = store.dispatch({
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
      }).should.be.rejectedWith('Error');
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
    });

    it('should resolve a promise when method is "updated" after returning', function () {
      const store = this.mockStore(createInitialState('1', {
        state: DDP_METHOD_STATE__RETURNED,
        result: 1,
      }));
      const assertion = store.dispatch({
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
      }).should.eventually.equal(1);
      store.dispatch({
        type: DDP_UPDATED,
        payload: {
          methods: ['1', '2'],
        },
      });
      return assertion;
    });

    it('should reject a promise when method is "updated" after returning', function () {
      const store = this.mockStore(createInitialState('1', {
        state: DDP_METHOD_STATE__RETURNED,
        error: {
          error: 'Error',
        },
      }));
      const assertion = store.dispatch({
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
      }).should.be.rejectedWith('Error');
      store.dispatch({
        type: DDP_UPDATED,
        payload: {
          methods: ['1', '2'],
        },
      });
      return assertion;
    });

    it('should resolve a promise when method is canceled', function () {
      const store = this.mockStore();
      const assertion = store.dispatch({
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
      }).should.eventually.equal(1);
      store.dispatch({
        type: DDP_CANCEL,
        payload: 1,
        meta: {
          id: '1',
        },
      });
      return assertion;
    });

    it('should reject a promise when method is canceled', function () {
      const store = this.mockStore();
      const assertion = store.dispatch({
        type: DDP_METHOD,
        payload: {
          id: '1',
        },
      }).should.be.rejectedWith('Error');
      store.dispatch({
        type: DDP_CANCEL,
        error: true,
        payload: new DDPError('Error'),
        meta: {
          id: '1',
        },
      });
      return assertion;
    });

    it('should cancel pending methods if connection is lost', function () {
      const store = this.mockStore(createInitialState('1', {
        state: DDP_METHOD_STATE__PENDING,
        name: 'A',
        socketId: '1',
      }));
      const action = {
        type: DDP_CLOSED,
        payload: {
        },
        meta: {
          socketId: '1',
        },
      };
      store.dispatch(action);
      store.getActions().should.deep.equal([
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
            id: '1',
            socketId: '1',
          },
        },
      ]);
    });

    it('should not cancel pending methods if retry flag is set', function () {
      const store = this.mockStore(createInitialState('1', {
        state: DDP_METHOD_STATE__PENDING,
        name: 'A',
        socketId: '1',
        retry: true,
      }));
      const action = {
        type: DDP_CLOSED,
        payload: {
        },
        meta: {
          socketId: '1',
        },
      };
      store.dispatch(action);
      store.getActions().should.deep.equal([
        action,
      ]);
    });

    it('should retry methods when connection is restored', function () {
      const store = this.mockStore(createInitialState('1', {
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
      store.getActions().should.deep.equal([
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
          },
        },
      ]);
    });
  });
});
