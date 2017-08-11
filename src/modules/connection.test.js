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
} from './connection';
import {
  DDP_CONNECTION_STATE__DISCONNECTED,
  DDP_CONNECTION_STATE__CONNECTING,
  DDP_CONNECTION_STATE__CONNECTED,

  DDP_ERROR,
  DDP_FAILED,
  DDP_METHOD,
  DDP_CONNECT,
  DDP_CONNECTED,
  DDP_PING,
  DDP_PONG,
  DDP_ENQUEUE,
  DDP_CLOSE,
} from '../constants';
import DDPError from '../DDPError';

class DDPClient extends DDPEmitter {
  constructor() {
    super();
    this.socket = new DDPEmitter();
  }
}

chai.should();
chai.use(sinonChai);

describe('Test module - connection', () => {
  describe('Reducer', () => {
    beforeEach(function () {
      this.reducer = createReducer(DDPClient);
    });

    it('should initialize state', function () {
      this.reducer(undefined, {}).should.deep.equal({
        state: DDP_CONNECTION_STATE__DISCONNECTED,
        queue: [],
      });
    });

    it('should change state to connecting', function () {
      this.reducer({
        state: DDP_CONNECTION_STATE__DISCONNECTED,
      }, {
        type: DDP_CONNECT,
        payload: {},
      }).should.deep.equal({
        state: DDP_CONNECTION_STATE__CONNECTING,
      });
    });

    it('should change state to connected', function () {
      this.reducer({
        state: DDP_CONNECTION_STATE__CONNECTING,
      }, {
        type: DDP_CONNECTED,
        payload: {},
      }).should.deep.equal({
        state: DDP_CONNECTION_STATE__CONNECTED,
      });
    });

    it('should change state to disconnected', function () {
      this.reducer({
        state: DDP_CONNECTION_STATE__CONNECTED,
      }, {
        type: DDP_CLOSE,
      }).should.deep.equal({
        state: DDP_CONNECTION_STATE__DISCONNECTED,
      });
    });

    it('should enqueue an action', function () {
      const action1 = {
        type: 'ACTION1',
      };
      const action2 = {
        type: 'ACTION2',
      };
      const state = this.reducer({
        state: DDP_CONNECTION_STATE__DISCONNECTED,
        queue: [action1],
      }, {
        type: DDP_ENQUEUE,
        payload: action2,
      });
      state.should.deep.equal({
        state: DDP_CONNECTION_STATE__DISCONNECTED,
        queue: [action1, action2],
      });
      state.queue[1].should.equal(action2);
    });

    it('should remove action from queue', function () {
      const action1 = { type: DDP_METHOD };
      const action2 = { type: DDP_METHOD };
      const state = this.reducer({
        state: DDP_CONNECTION_STATE__CONNECTED,
        queue: [action1, action2],
      }, action1);
      state.should.deep.equal({
        state: DDP_CONNECTION_STATE__CONNECTED,
        queue: [action2],
      });
    });
  });

  describe('Middleware', () => {
    beforeEach(function () {
      this.send = sinon.spy();
      this.close = sinon.spy();
      this.onError = sinon.spy();
      this.ddpClient = new DDPClient();
      this.ddpClient.socket.send = this.send;
      this.ddpClient.socket.close = this.close;
      this.ddpClient.on('error', this.onError);
      this.middleware = createMiddleware(this.ddpClient);
      this.mockStore = configureStore([
        this.middleware,
      ]);
    });

    it('should emit DDPError if message was invalid', function () {
      const store = this.mockStore({
        ddp: {
          connection: {
            state: DDP_CONNECTION_STATE__CONNECTED,
          },
        },
      });
      const ddpMessage = {
        msg: 'error',
        reason: 'Bad message',
      };
      this.ddpClient.socket.emit('message', ddpMessage);
      store.getActions().should.deep.equal([{
        type: DDP_ERROR,
        payload: ddpMessage,
      }]);
      this.onError.should.be.called;
      // NOTE: Comparing errors does not work because error stacks will be different
      ({
        ...this.onError.firstCall.args[0],
      }).should.deep.equal({
        ...new DDPError('badMessage', 'Bad message'),
      });
    });

    it('should close connection if connect failed', function () {
      const store = this.mockStore({
        ddp: {
          connection: {
            state: DDP_CONNECTION_STATE__CONNECTING,
          },
        },
      });
      const ddpMessage = {
        msg: 'failed',
        version: '2.0', // version of protocol which we are not supporting
      };
      this.ddpClient.socket.emit('message', ddpMessage);
      store.getActions().should.deep.equal([{
        type: DDP_FAILED,
        payload: ddpMessage,
      }]);
      this.close.should.be.called;
    });

    it('should dispatch CONNECTED action', function () {
      const store = this.mockStore({
        ddp: {
          connection: {
            state: DDP_CONNECTION_STATE__DISCONNECTED,
          },
        },
      });
      const ddpMessage = {
        msg: 'connected',
      };
      this.ddpClient.socket.emit('message', ddpMessage);
      store.getActions().should.deep.equal([{
        type: DDP_CONNECTED,
        payload: ddpMessage,
      }]);
      this.send.should.not.be.called;
    });

    it('should dispatch CLOSE action', function () {
      const store = this.mockStore({
        ddp: {
          connection: {
            state: DDP_CONNECTION_STATE__CONNECTED,
          },
        },
      });
      this.ddpClient.socket.emit('close');
      store.getActions().should.deep.equal([{
        type: DDP_CLOSE,
      }]);
    });

    it('should dispatch PONG on ddp ping', function () {
      const store = this.mockStore({
        ddp: {
          connection: {
            state: DDP_CONNECTION_STATE__CONNECTED,
          },
        },
      });
      const ping = { msg: 'ping', id: '1234' };
      const pong = { id: '1234' };

      this.ddpClient.socket.emit('message', ping);
      store.getActions().should.deep.equal([{
        type: DDP_PING,
        payload: ping,
      }, {
        type: DDP_PONG,
        payload: pong,
      }]);
      this.send.should.be.calledWith(pong);
    });

    it('should dispatch CONNECT action when socet emits "open"', function () {
      const store = this.mockStore({
        ddp: {
          connection: {
            state: DDP_CONNECTION_STATE__DISCONNECTED,
          },
        },
      });
      const ddpMessage = {
        msg: 'connect',
        support: ['1.0'],
        version: '1.0',
      };
      this.ddpClient.socket.emit('open');
      store.getActions().should.deep.equal([{
        type: DDP_CONNECT,
        payload: ddpMessage,
      }]);
      this.send.should.be.calledWith(ddpMessage);
    });

    it('should enqueue action if not currently connected', function () {
      const store = this.mockStore({
        ddp: {
          connection: {
            state: DDP_CONNECTION_STATE__DISCONNECTED,
            queue: [],
          },
        },
      });
      const ddpMessage = {
        msg: 'method',
        id: '1',
        method: 'aMethod',
        params: [1, 2, 3],
      };
      const action = {
        type: DDP_METHOD,
        payload: ddpMessage,
      };
      store.dispatch(action);
      store.getActions().should.deep.equal([{
        type: DDP_ENQUEUE,
        payload: action,
      }]);
    });

    it('should clear queue on establishing connection', function () {
      const ddpMessage = {
        msg: 'method',
        id: '1',
        method: 'aMethod',
        params: [1, 2, 3],
      };
      const action1 = { type: DDP_METHOD, payload: ddpMessage };
      const action2 = { type: DDP_METHOD, payload: ddpMessage };

      const store = this.mockStore({
        ddp: {
          connection: {
            state: DDP_CONNECTION_STATE__CONNECTED,
            queue: [action1, action2],
          },
        },
      });
      store.dispatch({
        type: DDP_CONNECTED,
      });

      store.getActions().should.deep.equal([
        {
          type: DDP_CONNECTED,
        },
        action1,
        action2,
      ]);
    });
  });
});
