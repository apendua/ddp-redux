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

  DDP_CONNECTION_STATE__DISCONNECTED,
  DDP_CONNECTION_STATE__CONNECTING,
  DDP_CONNECTION_STATE__CONNECTED,

  DDP_ERROR,
  DDP_FAILED,
  DDP_CONNECT,
  DDP_PING,
  DDP_PONG,
  DDP_DISCONNECTED,
  DDP_OPEN,
  DDP_CLOSE,
} from '../../constants';
import DDPError from '../../DDPError';
import {
  DDPClient,
} from './common.test';

const createInitialState = (socketId, socketState) => ({
  ddp: {
    connection: {
      sockets: {
        [socketId]: socketState,
      },
    },
  },
});

chai.should();
chai.use(sinonChai);

describe('Test module - connection - middleware', () => {
  beforeEach(function () {
    this.send = sinon.spy();
    this.close = sinon.spy();
    this.onError = sinon.spy();
    this.ddpClient = new DDPClient();
    this.ddpClient.send = this.send;
    this.ddpClient.close = this.close;
    this.ddpClient.on('error', this.onError);
    this.middleware = createMiddleware(this.ddpClient);
    this.mockStore = configureStore([
      this.middleware,
    ]);
  });

  beforeEach(function () {
    this.clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    this.clock.restore();
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

  it('should emit DDPError if message was invalid', function () {
    const store = this.mockStore(createInitialState('1', { state: DDP_CONNECTION_STATE__CONNECTED }));
    const ddpMessage = {
      msg: 'error',
      reason: 'Bad message',
    };
    store.dispatch({
      type: DDP_ERROR,
      payload: ddpMessage,
    });
    store.getActions().should.deep.equal([{
      type: DDP_ERROR,
      payload: ddpMessage,
    }]);
    this.onError.should.be.called;
    // NOTE: Comparing errors does not work because error stacks will be different
    ({
      ...this.onError.firstCall.args[0],
    }).should.deep.equal({
      ...new DDPError(DDPError.ERROR_BAD_MESSAGE, 'Bad message'),
    });
  });

  it('should close connection if connect failed', function () {
    const store = this.mockStore(createInitialState('1', { state: DDP_CONNECTION_STATE__CONNECTING }));
    const ddpMessage = {
      msg: 'failed',
      version: '2.0', // version of protocol which we are not supporting
    };
    store.dispatch({
      type: DDP_FAILED,
      payload: ddpMessage,
    });
    store.getActions().should.deep.equal([{
      type: DDP_FAILED,
      payload: ddpMessage,
    }]);
    this.close.should.be.called;
  });

  it('should dispatch CLOSE action', function () {
    const store = this.mockStore(createInitialState('1', { state: DDP_CONNECTION_STATE__CONNECTED }));
    this.ddpClient.emit('close', {
      socketId: '1',
    });
    store.getActions().should.deep.equal([{
      type: DDP_DISCONNECTED,
      meta: {
        socketId: '1',
      },
    }]);
  });

  it('should dispatch PONG on ddp ping', function () {
    const store = this.mockStore(createInitialState('1', { state: DDP_CONNECTION_STATE__CONNECTED }));
    const ping = { msg: 'ping', id: '1234' };
    const pong = { id: '1234' };

    store.dispatch({
      type: DDP_PING,
      payload: ping,
      meta: {
        socketId: '1',
      },
    });
    store.getActions().should.deep.equal([{
      type: DDP_PING,
      payload: ping,
      meta: {
        socketId: '1',
      },
    }, {
      type: DDP_PONG,
      payload: pong,
      meta: {
        socketId: '1',
      },
    }]);
  });

  it('should dispatch CONNECT action when socet emits "open"', function () {
    const store = this.mockStore(createInitialState('1', { state: DDP_CONNECTION_STATE__DISCONNECTED }));
    const ddpMessage = {
      support: ['1.0'],
      version: '1.0',
    };
    this.ddpClient.emit('open', {
      socketId: '1',
    });
    store.getActions().should.deep.equal([{
      type: DDP_CONNECT,
      payload: ddpMessage,
      meta: {
        socketId: '1',
      },
    }]);
  });

  it('should open a new connection when DDP_OPEN is dispatched', function () {
    const store = this.mockStore({
      ddp: {
        connection: {
          sockets: {},
        },
      },
    });
    const action = {
      type: DDP_OPEN,
      payload: {
        endpoint: 'http://example.com',
      },
    };
    const socketId = store.dispatch(action);
    socketId.should.equal(DEFAULT_SOCKET_ID);
    store.getActions().should.deep.equal([
      {
        ...action,
        meta: {
          socketId,
        },
      },
    ]);
    this.ddpClient.sockets[DEFAULT_SOCKET_ID].should.deep.equal({
      endpoint: 'http://example.com',
    });
  });

  it('should not open a new connection if theres already one with required parameters', function () {
    const store = this.mockStore({
      ddp: {
        connection: {
          sockets: {
            'socket/1': {
              id: 'socket/1',
              endpoint: 'http://example.com',
            },
          },
        },
      },
    });
    const action = {
      type: DDP_OPEN,
      payload: {
        endpoint: 'http://example.com',
      },
    };
    const socketId = store.dispatch(action);
    socketId.should.equal('socket/1');
    store.getActions().should.deep.equal([
      {
        ...action,
        meta: {
          socketId,
        },
      },
    ]);
    this.ddpClient.sockets.should.deep.equal({});
  });

  it('should close connection if there is only one user', function () {
    const store = this.mockStore({
      ddp: {
        connection: {
          sockets: {
            'socket/1': {
              id: 'socket/1',
              users: 1,
              endpoint: 'http://example.com',
            },
          },
        },
      },
    });
    const action = {
      type: DDP_CLOSE,
      meta: {
        socketId: 'socket/1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
    ]);
    this.clock.tick(30000);
    this.close.should.be.called;
  });

  it('should not close connection if there are many users', function () {
    const store = this.mockStore({
      ddp: {
        connection: {
          sockets: {
            'socket/1': {
              id: 'socket/1',
              users: 2,
              endpoint: 'http://example.com',
            },
          },
        },
      },
    });
    const action = {
      type: DDP_CLOSE,
      meta: {
        socketId: 'socket/1',
      },
    };
    store.dispatch(action);
    store.getActions().should.deep.equal([
      action,
    ]);
    this.clock.tick(30000);
    this.close.should.not.have.been.called;
  });
});
