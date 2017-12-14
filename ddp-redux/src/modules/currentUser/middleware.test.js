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

describe('Test module - currentUser - middleware', () => {
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
});
