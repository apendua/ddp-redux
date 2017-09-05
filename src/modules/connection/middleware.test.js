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
  DDP_CONNECTION_STATE__DISCONNECTED,
  DDP_CONNECTION_STATE__CONNECTING,
  DDP_CONNECTION_STATE__CONNECTED,

  DDP_ERROR,
  DDP_FAILED,
  DDP_CONNECT,
  DDP_PING,
  DDP_PONG,
  DDP_CLOSED,
} from '../../constants';
import DDPError from '../../DDPError';
import {
  DDPClient,
} from './common.test';

const createInitialState = (socketId, connectionState) => ({
  ddp: {
    connection: {
      sockets: {
        [socketId]: {
          state: connectionState,
        },
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
    const store = this.mockStore(createInitialState('1', DDP_CONNECTION_STATE__CONNECTED));
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
      ...new DDPError('badMessage', 'Bad message'),
    });
  });

  it('should close connection if connect failed', function () {
    const store = this.mockStore(createInitialState('1', DDP_CONNECTION_STATE__CONNECTING));
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
    const store = this.mockStore(createInitialState('1', DDP_CONNECTION_STATE__CONNECTED));
    this.ddpClient.emit('close', {
      socketId: '1',
    });
    store.getActions().should.deep.equal([{
      type: DDP_CLOSED,
      meta: {
        socketId: '1',
      },
    }]);
  });

  it('should dispatch PONG on ddp ping', function () {
    const store = this.mockStore(createInitialState('1', DDP_CONNECTION_STATE__CONNECTED));
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
    const store = this.mockStore(createInitialState('1', DDP_CONNECTION_STATE__DISCONNECTED));
    const ddpMessage = {
      msg: 'connect',
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
});
