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
  DDP_FLUSH,
  DDP_ADDED,

  MSG_ADDED,
  MSG_CHANGED,
  MSG_REMOVED,
} from '../../constants';
import {
  DDPClient,
} from './common.test';

chai.should();
chai.use(sinonChai);

describe('Test module - collections - middleware', () => {
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

  [
    MSG_ADDED,
    MSG_CHANGED,
    MSG_REMOVED,
  ].forEach((event) => {
    it(`should dispatch FLUSH after ${event}`, function () {
      const store = this.mockStore({
        ddp: {
          collections: {},
        },
      });
      const action = {
        type: DDP_ADDED,
        payload: {
          msg: event,
          id: '1',
          collection: 'col1',
        },
        meta: {
          socketId: 'socket/1',
        },
      };
      store.dispatch(action);
      store.getActions().should.deep.equal([
        action,
      ]);

      this.clock.tick(1000);

      store.getActions().should.deep.equal([
        action,
        {
          type: DDP_FLUSH,
        },
      ]);
    });
  });
});
